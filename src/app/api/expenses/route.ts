import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { route, parseBody, parseQuery, csvResponse } from "@/lib/ops/api";
import { ApiError, assertBranchAccess, branchWhere, can } from "@/lib/ops/access";
import { audit, userNames } from "@/lib/ops/audit";
import { getOpsSettings } from "@/lib/ops/settings";
import { money } from "@/lib/money";
import {
  countedExpenseWhere,
  ensureDefaultCategories,
  expenseCreateSchema,
  expenseDateFilter,
  runRecurringExpenses,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUSES,
} from "@/lib/ops/expenses";
import { parseDay } from "@/lib/ops/periods";
import { dayStr, pageQuery } from "@/lib/ops/schemas";

const listQuery = pageQuery.extend({
  from: dayStr.optional(),
  to: dayStr.optional(),
  categoryId: z.string().optional(),
  branchId: z.string().optional(),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).optional(),
  status: z.enum(EXPENSE_STATUSES).optional(),
  search: z.string().max(100).optional(),
  sort: z.enum(["expenseDate", "amount", "createdAt"]).default("expenseDate"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  includeDeleted: z.enum(["true", "false"]).optional(),
  export: z.enum(["csv"]).optional(),
  autoGenerate: z.enum(["true", "false"]).optional(),
});

export const GET = route({ permission: "expense.view" }, async ({ ctx, req }) => {
  const q = parseQuery(req, listQuery);
  await ensureDefaultCategories(ctx.salonId);

  // Lazily materialise due recurring expenses (idempotent) when the list is opened
  if (q.autoGenerate === "true" && can(ctx.role, "expense.create")) {
    await runRecurringExpenses(ctx.salonId, {
      branchIds: ctx.branchScope === "ALL" ? undefined : ctx.branchScope,
    });
  }

  const where: Prisma.ExpenseWhereInput = {
    salonId: ctx.salonId,
    ...(await branchWhere(ctx, q.branchId)),
    ...(q.includeDeleted === "true" ? {} : { deletedAt: null }),
    ...(q.categoryId ? { categoryId: q.categoryId } : {}),
    ...(q.paymentMethod ? { paymentMethod: q.paymentMethod } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(expenseDateFilter(q.from, q.to) ? { expenseDate: expenseDateFilter(q.from, q.to) } : {}),
    ...(q.search
      ? {
          OR: [
            { description: { contains: q.search, mode: "insensitive" } },
            { referenceNo: { contains: q.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const include = {
    category: { select: { id: true, name: true } },
    branch: { select: { id: true, name: true } },
    attachments: { select: { id: true, fileId: true, fileName: true, mimeType: true, size: true } },
  } satisfies Prisma.ExpenseInclude;

  if (q.export === "csv") {
    const rows = await prisma.expense.findMany({
      where,
      include,
      orderBy: { [q.sort]: q.dir },
      take: 10000,
    });
    const names = await userNames(rows.flatMap((r) => [r.createdById, r.approvedById]));
    return csvResponse("expenses.csv", [
      ["Date", "Branch", "Category", "Description", "Reference", "Amount", "Payment method", "Status", "Created by", "Approved by"],
      ...rows.map((r) => [
        r.expenseDate.toISOString().slice(0, 10),
        r.branch.name,
        r.category.name,
        r.description,
        r.referenceNo,
        money(r.amount),
        r.paymentMethod,
        r.status,
        names[r.createdById] || "",
        r.approvedById ? names[r.approvedById] || "" : "",
      ]),
    ]);
  }

  const [items, total, counted, pending] = await Promise.all([
    prisma.expense.findMany({
      where,
      include,
      orderBy: { [q.sort]: q.dir },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.expense.count({ where }),
    // Totals only ever count APPROVED, non-deleted, non-voided expenses within the same filters
    prisma.expense.aggregate({
      where: { ...where, ...countedExpenseWhere(ctx.salonId) },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { ...where, deletedAt: null, status: "PENDING" },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const names = await userNames(items.flatMap((r) => [r.createdById, r.approvedById]));
  return {
    expenses: items.map((e) => ({
      ...e,
      createdByName: names[e.createdById] || null,
      approvedByName: e.approvedById ? names[e.approvedById] || null : null,
    })),
    total,
    page: q.page,
    limit: q.limit,
    totals: {
      approvedAmount: money(counted._sum.amount),
      approvedCount: counted._count,
      pendingAmount: money(pending._sum.amount),
      pendingCount: pending._count,
    },
    permissions: {
      canCreate: can(ctx.role, "expense.create"),
      canEdit: can(ctx.role, "expense.edit"),
      canApprove: can(ctx.role, "expense.approve"),
      canDelete: can(ctx.role, "expense.delete"),
    },
  };
});

export const POST = route({ permission: "expense.create", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, expenseCreateSchema);
  await assertBranchAccess(ctx, body.branchId);

  const category = await prisma.expenseCategory.findFirst({
    where: { id: body.categoryId, salonId: ctx.salonId, isActive: true },
  });
  if (!category) throw new ApiError(400, "Expense category not found");

  const settings = await getOpsSettings(ctx.salonId);
  const autoApprove =
    ctx.role === "SALON_OWNER" && settings.expenseAutoApproveOwner && can(ctx.role, "expense.approve");

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        salonId: ctx.salonId,
        branchId: body.branchId,
        categoryId: body.categoryId,
        description: body.description,
        referenceNo: body.referenceNo,
        amount: money(body.amount),
        expenseDate: parseDay(body.expenseDate),
        paymentMethod: body.paymentMethod,
        notes: body.notes,
        createdById: ctx.userId,
        status: autoApprove ? "APPROVED" : "PENDING",
        approvedById: autoApprove ? ctx.userId : null,
        approvedAt: autoApprove ? new Date() : null,
      },
    });
    await audit(tx, ctx, "EXPENSE_CREATED", "Expense", created.id, {
      newData: {
        amount: created.amount,
        branchId: created.branchId,
        categoryId: created.categoryId,
        status: created.status,
        expenseDate: created.expenseDate,
      },
      req,
    });
    return created;
  });

  return Response.json({ expense }, { status: 201 });
});
