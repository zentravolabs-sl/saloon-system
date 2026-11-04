import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";
import { ensureDefaultCategories } from "@/lib/ops/expenses";

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).optional().nullable(),
});
const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(200).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const GET = route({ permission: ["expense.view", "expense.create"] }, async ({ ctx }) => {
  await ensureDefaultCategories(ctx.salonId);
  const categories = await prisma.expenseCategory.findMany({
    where: { salonId: ctx.salonId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    include: { _count: { select: { expenses: { where: { deletedAt: null } } } } },
  });
  return { categories };
});

export const POST = route({ permission: "expense.edit", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, createSchema);
  const exists = await prisma.expenseCategory.findFirst({
    where: { salonId: ctx.salonId, name: { equals: body.name, mode: "insensitive" } },
  });
  if (exists) throw new ApiError(409, "A category with this name already exists");
  const category = await prisma.$transaction(async (tx) => {
    const c = await tx.expenseCategory.create({
      data: { salonId: ctx.salonId, name: body.name, description: body.description || null },
    });
    await audit(tx, ctx, "EXPENSE_CATEGORY_CREATED", "ExpenseCategory", c.id, { newData: { name: c.name }, req });
    return c;
  });
  return Response.json({ category }, { status: 201 });
});

export const PATCH = route({ permission: "expense.edit", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, updateSchema);
  const cat = await prisma.expenseCategory.findFirst({ where: { id: body.id, salonId: ctx.salonId } });
  if (!cat) throw new ApiError(404, "Category not found");
  if (cat.isSystem && body.name && body.name !== cat.name) {
    throw new ApiError(400, "Built-in categories cannot be renamed (you can deactivate them)");
  }
  const category = await prisma.$transaction(async (tx) => {
    const c = await tx.expenseCategory.update({
      where: { id: cat.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
    await audit(tx, ctx, "EXPENSE_CATEGORY_UPDATED", "ExpenseCategory", c.id, {
      oldData: { name: cat.name, isActive: cat.isActive },
      newData: { name: c.name, isActive: c.isActive },
      req,
    });
    return c;
  });
  return { category };
});

export const DELETE = route({ permission: "expense.edit", write: true }, async ({ ctx, req }) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new ApiError(400, "id is required");
  const cat = await prisma.expenseCategory.findFirst({
    where: { id, salonId: ctx.salonId },
    include: { _count: { select: { expenses: true, recurringExpenses: true } } },
  });
  if (!cat) throw new ApiError(404, "Category not found");
  if (cat.isSystem) throw new ApiError(400, "Built-in categories cannot be deleted (deactivate instead)");
  if (cat._count.expenses > 0 || cat._count.recurringExpenses > 0) {
    throw new ApiError(409, "This category is in use. Deactivate it instead.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.expenseCategory.delete({ where: { id: cat.id } });
    await audit(tx, ctx, "EXPENSE_CATEGORY_DELETED", "ExpenseCategory", cat.id, { oldData: { name: cat.name }, req });
  });
  return { ok: true };
});
