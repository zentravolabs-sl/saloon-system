import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError, assertBranchAccess } from "@/lib/ops/access";
import { audit, userNames } from "@/lib/ops/audit";
import { D, money, qty } from "@/lib/money";
import { poUpdateSchema } from "@/lib/ops/inventory-schemas";
import { assertProductsInSalon, loadSupplier } from "@/lib/ops/lookups";
import { parseDay } from "@/lib/ops/periods";

type P = { id: string };

async function loadPO(ctx: any, id: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, salonId: ctx.salonId },
    include: {
      supplier: true,
      branch: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
      },
      receipts: {
        include: {
          items: { include: { product: { select: { name: true, sku: true } } } },
        },
        orderBy: { receivedAt: "desc" },
      },
    },
  });
  if (!po) throw new ApiError(404, "Purchase order not found");
  await assertBranchAccess(ctx, po.branchId);
  return po;
}

export const GET = route<P>({ permission: ["po.manage", "inventory.view"] }, async ({ ctx, params }) => {
  const po = await loadPO(ctx, params.id);
  const names = await userNames([po.createdById]);
  return { purchaseOrder: { ...po, createdByName: names[po.createdById] || null } };
});

export const PATCH = route<P>({ permission: "po.manage", write: true }, async ({ ctx, req, params }) => {
  const po = await loadPO(ctx, params.id);
  if (po.status !== "DRAFT") {
    throw new ApiError(409, "Only draft purchase orders can be edited");
  }

  const body = await parseBody(req, poUpdateSchema);
  if (body.supplierId && body.supplierId !== po.supplierId) {
    await loadSupplier(ctx, body.supplierId);
  }

  let subtotal = D(po.subtotal);
  let taxAmount = D(po.taxAmount);
  let totalAmount = D(po.totalAmount);

  const updated = await prisma.$transaction(async (tx) => {
    if (body.items) {
      await assertProductsInSalon(ctx, body.items.map((i) => i.productId));
      subtotal = D(0);
      taxAmount = D(0);
      const lines = body.items.map((item) => {
        const q = D(item.quantityOrdered);
        const cost = D(item.unitCost);
        const taxRate = D(item.taxRate || 0);
        const lineSubtotal = q.times(cost);
        const lineTax = lineSubtotal.times(taxRate).div(100);
        subtotal = subtotal.plus(lineSubtotal);
        taxAmount = taxAmount.plus(lineTax);
        return {
          purchaseOrderId: po.id,
          productId: item.productId,
          quantityOrdered: qty(q),
          quantityReceived: qty(0),
          unitCost: money(cost),
          taxRate: String(taxRate),
        };
      });
      totalAmount = subtotal.plus(taxAmount);

      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: po.id } });
      await tx.purchaseOrderItem.createMany({ data: lines });
    }

    const res = await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        ...(body.supplierId ? { supplierId: body.supplierId } : {}),
        ...(body.expectedDate !== undefined ? { expectedDate: body.expectedDate ? parseDay(body.expectedDate) : null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        subtotal: money(subtotal),
        taxAmount: money(taxAmount),
        totalAmount: money(totalAmount),
      },
      include: { items: { include: { product: true } } },
    });

    await audit(tx, ctx, "PO_UPDATED", "PurchaseOrder", po.id, { newData: body, req });
    return res;
  });

  return { purchaseOrder: updated };
});

const actionSchema = z.object({
  action: z.enum(["order", "cancel"]),
});

export const POST = route<P>({ permission: "po.manage", write: true }, async ({ ctx, req, params }) => {
  const po = await loadPO(ctx, params.id);
  const { action } = await parseBody(req, actionSchema);

  if (action === "order") {
    if (po.status !== "DRAFT") throw new ApiError(409, "Only draft POs can be marked ordered");
    const updated = await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: "ORDERED", orderedAt: new Date() },
    });
    await audit(prisma, ctx, "PO_ORDERED", "PurchaseOrder", po.id, { req });
    return { purchaseOrder: updated };
  }

  if (action === "cancel") {
    if (po.status === "RECEIVED" || po.status === "CANCELLED") {
      throw new ApiError(409, "Cannot cancel a received or cancelled PO");
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    await audit(prisma, ctx, "PO_CANCELLED", "PurchaseOrder", po.id, { req });
    return { purchaseOrder: updated };
  }

  throw new ApiError(400, "Invalid action");
});
