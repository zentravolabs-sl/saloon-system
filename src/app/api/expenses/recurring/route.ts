import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError, assertBranchAccess, branchWhere } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";
import { money } from "@/lib/money";
import {
  recurringCreateSchema,
  recurringUpdateSchema,
  runRecurringExpenses,
} from "@/lib/ops/expenses";
import { parseDay } from "@/lib/ops/periods";

export const GET = route({ permission: "expense.view" }, async ({ ctx }) => {
  const recurring = await prisma.recurringExpense.findMany({
    where: { salonId: ctx.salonId, ...(await branchWhere(ctx)) },
    include: {
      category: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: [{ isActive: "desc" }, { nextRunDate: "asc" }],
  });
  return { recurring };
});

export const POST = route({ permission: "expense.create", write: true }, async ({ ctx, req }) => {
  const url = new URL(req.url);

  // POST /api/expenses/recurring?run=1 => generate all due occurrences now
  if (url.searchParams.get("run") === "1") {
    const result = await runRecurringExpenses(ctx.salonId, {
      branchIds: ctx.branchScope === "ALL" ? undefined : ctx.branchScope,
    });
    return result;
  }

  const body = await parseBody(req, recurringCreateSchema);
  await assertBranchAccess(ctx, body.branchId);
  const cat = await prisma.expenseCategory.findFirst({
    where: { id: body.categoryId, salonId: ctx.salonId, isActive: true },
  });
  if (!cat) throw new ApiError(400, "Expense category not found");
  if (body.endDate && parseDay(body.endDate) < parseDay(body.startDate)) {
    throw new ApiError(400, "End date cannot be before the start date");
  }

  const rule = await prisma.$transaction(async (tx) => {
    const r = await tx.recurringExpense.create({
      data: {
        salonId: ctx.salonId,
        branchId: body.branchId,
        categoryId: body.categoryId,
        description: body.description,
        amount: money(body.amount),
        paymentMethod: body.paymentMethod,
        frequency: body.frequency,
        startDate: parseDay(body.startDate),
        endDate: body.endDate ? parseDay(body.endDate) : null,
        nextRunDate: parseDay(body.startDate),
        autoApprove: body.autoApprove,
        createdById: ctx.userId,
      },
    });
    await audit(tx, ctx, "RECURRING_EXPENSE_CREATED", "RecurringExpense", r.id, {
      newData: { amount: r.amount, frequency: r.frequency, branchId: r.branchId },
      req,
    });
    return r;
  });
  return Response.json({ recurring: rule }, { status: 201 });
});

export const PATCH = route({ permission: "expense.edit", write: true }, async ({ ctx, req }) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new ApiError(400, "id is required");
  const existing = await prisma.recurringExpense.findFirst({ where: { id, salonId: ctx.salonId } });
  if (!existing) throw new ApiError(404, "Recurring expense not found");
  await assertBranchAccess(ctx, existing.branchId);
  const body = await parseBody(req, recurringUpdateSchema);
  if (body.categoryId) {
    const cat = await prisma.expenseCategory.findFirst({ where: { id: body.categoryId, salonId: ctx.salonId } });
    if (!cat) throw new ApiError(400, "Expense category not found");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.recurringExpense.update({
      where: { id },
      data: {
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.amount !== undefined ? { amount: money(body.amount) } : {}),
        ...(body.paymentMethod !== undefined ? { paymentMethod: body.paymentMethod } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.autoApprove !== undefined ? { autoApprove: body.autoApprove } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.endDate !== undefined ? { endDate: body.endDate ? parseDay(body.endDate) : null } : {}),
      },
    });
    await audit(tx, ctx, "RECURRING_EXPENSE_UPDATED", "RecurringExpense", id, {
      oldData: { amount: existing.amount, isActive: existing.isActive },
      newData: { amount: r.amount, isActive: r.isActive },
      req,
    });
    return r;
  });
  return { recurring: updated };
});

export const DELETE = route({ permission: "expense.edit", write: true }, async ({ ctx, req }) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new ApiError(400, "id is required");
  const existing = await prisma.recurringExpense.findFirst({ where: { id, salonId: ctx.salonId } });
  if (!existing) throw new ApiError(404, "Recurring expense not found");
  await assertBranchAccess(ctx, existing.branchId);
  // Already generated expenses are real records and are kept; the schedule is just stopped
  await prisma.$transaction(async (tx) => {
    await tx.recurringExpense.update({ where: { id }, data: { isActive: false } });
    await audit(tx, ctx, "RECURRING_EXPENSE_STOPPED", "RecurringExpense", id, { req });
  });
  return { ok: true };
});
