import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError, assertBranchAccess, can, type AccessContext } from "@/lib/ops/access";
import { audit, userNames } from "@/lib/ops/audit";
import { money } from "@/lib/money";
import { expenseUpdateSchema } from "@/lib/ops/expenses";
import { parseDay } from "@/lib/ops/periods";

type P = { id: string };

/** Loads an expense ONLY if it belongs to the caller's salon and an accessible branch */
async function loadExpense(ctx: AccessContext, id: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, salonId: ctx.salonId },
    include: {
      category: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      attachments: { select: { id: true, fileId: true, fileName: true, mimeType: true, size: true, createdAt: true } },
    },
  });
  if (!expense) throw new ApiError(404, "Expense not found");
  await assertBranchAccess(ctx, expense.branchId);
  return expense;
}

export const GET = route<P>({ permission: "expense.view" }, async ({ ctx, params }) => {
  const expense = await loadExpense(ctx, params.id);
  const history = await prisma.auditLog.findMany({
    where: { salonId: ctx.salonId, entity: "Expense", entityId: expense.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, action: true, userId: true, oldData: true, newData: true, metadata: true, createdAt: true },
  });
  const names = await userNames([
    expense.createdById,
    expense.approvedById,
    expense.voidedById,
    ...history.map((h) => h.userId),
  ]);
  return {
    expense: {
      ...expense,
      createdByName: names[expense.createdById] || null,
      approvedByName: expense.approvedById ? names[expense.approvedById] || null : null,
      voidedByName: expense.voidedById ? names[expense.voidedById] || null : null,
    },
    history: history.map((h) => ({ ...h, userName: h.userId ? names[h.userId] || null : null })),
  };
});

export const PATCH = route<P>({ permission: "expense.edit", write: true }, async ({ ctx, req, params }) => {
  const existing = await loadExpense(ctx, params.id);
  if (existing.deletedAt) throw new ApiError(404, "Expense not found");
  if (existing.status === "VOIDED") throw new ApiError(409, "A voided expense cannot be edited");

  const body = await parseBody(req, expenseUpdateSchema);

  // Editing an already-approved expense requires approval rights (it affects reported figures)
  if (existing.status === "APPROVED" && !can(ctx.role, "expense.approve")) {
    throw new ApiError(403, "Only an approver can edit an approved expense");
  }

  if (body.branchId && body.branchId !== existing.branchId) await assertBranchAccess(ctx, body.branchId);
  if (body.categoryId) {
    const cat = await prisma.expenseCategory.findFirst({
      where: { id: body.categoryId, salonId: ctx.salonId },
    });
    if (!cat) throw new ApiError(400, "Expense category not found");
  }

  const data = {
    ...(body.branchId !== undefined ? { branchId: body.branchId } : {}),
    ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.referenceNo !== undefined ? { referenceNo: body.referenceNo } : {}),
    ...(body.amount !== undefined ? { amount: money(body.amount) } : {}),
    ...(body.expenseDate !== undefined ? { expenseDate: parseDay(body.expenseDate) } : {}),
    ...(body.paymentMethod !== undefined ? { paymentMethod: body.paymentMethod } : {}),
    ...(body.notes !== undefined ? { notes: body.notes } : {}),
  };

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.expense.update({
      where: { id: existing.id },
      data: {
        ...data,
        // A rejected expense that is corrected goes back for approval
        ...(existing.status === "REJECTED" ? { status: "PENDING", rejectionReason: null } : {}),
      },
    });
    await audit(tx, ctx, "EXPENSE_UPDATED", "Expense", existing.id, {
      oldData: {
        amount: existing.amount,
        branchId: existing.branchId,
        categoryId: existing.categoryId,
        description: existing.description,
        expenseDate: existing.expenseDate,
        paymentMethod: existing.paymentMethod,
        referenceNo: existing.referenceNo,
        status: existing.status,
      },
      newData: data,
      req,
    });
    return result;
  });
  return { expense: updated };
});

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "void"]),
  reason: z.string().trim().max(500).optional(),
});

/** Approve / reject / void workflow */
export const POST = route<P>({ permission: ["expense.approve"], write: true }, async ({ ctx, req, params }) => {
  const existing = await loadExpense(ctx, params.id);
  if (existing.deletedAt) throw new ApiError(404, "Expense not found");
  const { action, reason } = await parseBody(req, actionSchema);

  if (action === "approve" || action === "reject") {
    if (existing.status !== "PENDING") throw new ApiError(409, "Only pending expenses can be approved or rejected");
    // Segregation of duties: only the owner may approve their own entry
    if (action === "approve" && existing.createdById === ctx.userId && ctx.role !== "SALON_OWNER") {
      throw new ApiError(403, "You cannot approve an expense you created");
    }
    if (action === "reject" && !reason) throw new ApiError(400, "A reason is required to reject");
  }
  if (action === "void") {
    if (existing.status === "VOIDED") throw new ApiError(409, "Expense is already voided");
    if (!reason) throw new ApiError(400, "A reason is required to void an expense");
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Compare-and-set on current status guards against concurrent actions
    const res = await tx.expense.updateMany({
      where: { id: existing.id, status: existing.status },
      data:
        action === "approve"
          ? { status: "APPROVED", approvedById: ctx.userId, approvedAt: new Date(), rejectionReason: null }
          : action === "reject"
          ? { status: "REJECTED", rejectionReason: reason }
          : { status: "VOIDED", voidedById: ctx.userId, voidedAt: new Date(), voidReason: reason },
    });
    if (res.count === 0) throw new ApiError(409, "Expense was changed by someone else. Refresh and try again.");
    await audit(tx, ctx, `EXPENSE_${action.toUpperCase()}${action === "void" ? "ED" : action === "approve" ? "D" : "ED"}`, "Expense", existing.id, {
      oldData: { status: existing.status },
      newData: { status: action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : "VOIDED" },
      metadata: { reason: reason || null, amount: existing.amount },
      req,
    });
    return tx.expense.findUnique({ where: { id: existing.id } });
  });
  return { expense: updated };
});

export const DELETE = route<P>({ permission: ["expense.delete", "expense.edit"], write: true }, async ({ ctx, req, params }) => {
  const existing = await loadExpense(ctx, params.id);
  if (existing.deletedAt) throw new ApiError(404, "Expense not found");

  const isOwnerLevel = can(ctx.role, "expense.delete");
  if (!isOwnerLevel) {
    // Non-owners may only delete their own un-approved entries
    if (existing.createdById !== ctx.userId || !["PENDING", "REJECTED"].includes(existing.status)) {
      throw new ApiError(403, "You can only delete your own pending or rejected expenses");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), deletedById: ctx.userId },
    });
    await audit(tx, ctx, "EXPENSE_DELETED", "Expense", existing.id, {
      oldData: { amount: existing.amount, status: existing.status, description: existing.description },
      req,
    });
  });
  return { ok: true };
});
