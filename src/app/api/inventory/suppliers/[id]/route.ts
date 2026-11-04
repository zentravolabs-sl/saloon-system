import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";
import { supplierSchema } from "@/lib/ops/inventory-schemas";
import { loadSupplier } from "@/lib/ops/lookups";

type P = { id: string };

export const GET = route<P>({ permission: ["supplier.manage", "inventory.view"] }, async ({ ctx, params }) => {
  const supplier = await loadSupplier(ctx, params.id);
  const [purchaseOrders, goodsReceipts] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { supplierId: supplier.id },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.goodsReceipt.findMany({
      where: { supplierId: supplier.id },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return { supplier, purchaseOrders, goodsReceipts };
});

export const PATCH = route<P>({ permission: "supplier.manage", write: true }, async ({ ctx, req, params }) => {
  const existing = await loadSupplier(ctx, params.id);
  const body = await parseBody(req, supplierSchema.partial());

  if (body.name && body.name.toLowerCase() !== existing.name.toLowerCase()) {
    const dup = await prisma.supplier.findFirst({
      where: { salonId: ctx.salonId, name: { equals: body.name, mode: "insensitive" }, NOT: { id: existing.id } },
    });
    if (dup) throw new ApiError(409, "A supplier with this name already exists");
  }

  const supplier = await prisma.$transaction(async (tx) => {
    const s = await tx.supplier.update({
      where: { id: existing.id },
      data: body,
    });
    await audit(tx, ctx, "SUPPLIER_UPDATED", "Supplier", s.id, {
      oldData: { name: existing.name, phone: existing.phone, isActive: existing.isActive },
      newData: body,
      req,
    });
    return s;
  });

  return { supplier };
});

export const DELETE = route<P>({ permission: "supplier.manage", write: true }, async ({ ctx, req, params }) => {
  const existing = await loadSupplier(ctx, params.id);
  const count = await prisma.purchaseOrder.count({ where: { supplierId: existing.id } });
  if (count > 0) {
    // Has purchase history -> deactivate instead of hard delete
    await prisma.supplier.update({ where: { id: existing.id }, data: { isActive: false } });
    await audit(prisma, ctx, "SUPPLIER_DEACTIVATED", "Supplier", existing.id, { req });
    return { ok: true, deactivated: true, message: "Supplier has order history and was deactivated" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplier.delete({ where: { id: existing.id } });
    await audit(tx, ctx, "SUPPLIER_DELETED", "Supplier", existing.id, { oldData: { name: existing.name }, req });
  });

  return { ok: true };
});
