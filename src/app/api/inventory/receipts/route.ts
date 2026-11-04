import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { route, parseBody, parseQuery, csvResponse } from "@/lib/ops/api";
import { ApiError, assertBranchAccess, branchWhere } from "@/lib/ops/access";
import { audit, nextNumber, userNames } from "@/lib/ops/audit";
import { D, money, qty } from "@/lib/money";
import { stockIn } from "@/lib/ops/inventory";
import { receiptSchema } from "@/lib/ops/inventory-schemas";
import { assertProductsInSalon, loadSupplier } from "@/lib/ops/lookups";
import { parseDay } from "@/lib/ops/periods";
import { pageQuery } from "@/lib/ops/schemas";

const query = pageQuery.extend({
  branchId: z.string().optional(),
  supplierId: z.string().optional(),
  export: z.enum(["csv"]).optional(),
});

export const GET = route({ permission: ["po.manage", "inventory.view"] }, async ({ ctx, req }) => {
  const q = parseQuery(req, query);
  const where: Prisma.GoodsReceiptWhereInput = {
    salonId: ctx.salonId,
    ...(await branchWhere(ctx, q.branchId)),
    ...(q.supplierId ? { supplierId: q.supplierId } : {}),
  };

  const include = {
    branch: { select: { id: true, name: true } },
    supplier: { select: { id: true, name: true } },
    purchaseOrder: { select: { id: true, poNumber: true } },
    items: {
      include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
    },
  } satisfies Prisma.GoodsReceiptInclude;

  const take = q.export === "csv" ? 10000 : q.limit;
  const [receipts, total] = await Promise.all([
    prisma.goodsReceipt.findMany({
      where,
      include,
      orderBy: { receivedAt: "desc" },
      skip: q.export === "csv" ? 0 : (q.page - 1) * q.limit,
      take,
    }),
    prisma.goodsReceipt.count({ where }),
  ]);

  if (q.export === "csv") {
    return csvResponse("goods-receipts.csv", [
      ["Receipt No", "Date", "Branch", "Supplier", "PO Number", "Supplier Invoice", "Total Cost"],
      ...receipts.map((r) => [
        r.receiptNumber,
        r.receivedAt.toISOString().slice(0, 10),
        r.branch.name,
        r.supplier?.name || "-",
        r.purchaseOrder?.poNumber || "-",
        r.supplierInvoiceNo || "-",
        money(r.totalCost),
      ]),
    ]);
  }

  const names = await userNames(receipts.map((r) => r.receivedById));
  return {
    receipts: receipts.map((r) => ({ ...r, receivedByName: names[r.receivedById] || null })),
    total,
    page: q.page,
    limit: q.limit,
  };
});

export const POST = route({ permission: "po.manage", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, receiptSchema);

  let targetBranchId: string;
  let targetSupplierId: string | null = null;
  let po: any = null;

  if (body.purchaseOrderId) {
    po = await prisma.purchaseOrder.findFirst({
      where: { id: body.purchaseOrderId, salonId: ctx.salonId },
      include: { items: true },
    });
    if (!po) throw new ApiError(404, "Purchase order not found");
    if (po.status === "CANCELLED") throw new ApiError(409, "Cannot receive items against a cancelled PO");
    targetBranchId = po.branchId;
    targetSupplierId = po.supplierId;
  } else {
    if (!body.branchId) throw new ApiError(400, "branchId is required when receiving without a PO");
    targetBranchId = body.branchId;
    if (body.supplierId) {
      const s = await loadSupplier(ctx, body.supplierId);
      targetSupplierId = s.id;
    }
  }

  await assertBranchAccess(ctx, targetBranchId);
  await assertProductsInSalon(ctx, body.items.map((i) => i.productId));

  const receipt = await prisma.$transaction(
    async (tx) => {
      const receiptNumber = await nextNumber(tx, ctx.salonId, "RECEIPT", "GRN", 5);
      let totalCost = D(0);

      for (const item of body.items) {
        totalCost = totalCost.plus(D(item.quantity).times(D(item.unitCost)));
      }

      const grn = await tx.goodsReceipt.create({
        data: {
          salonId: ctx.salonId,
          branchId: targetBranchId,
          supplierId: targetSupplierId,
          purchaseOrderId: po?.id || null,
          receiptNumber,
          supplierInvoiceNo: body.supplierInvoiceNo,
          notes: body.notes,
          totalCost: money(totalCost),
          receivedById: ctx.userId,
        },
      });

      for (const item of body.items) {
        const itemQty = D(item.quantity);
        const itemCost = D(item.unitCost);

        await tx.goodsReceiptItem.create({
          data: {
            receiptId: grn.id,
            productId: item.productId,
            poItemId: item.poItemId || null,
            quantity: qty(itemQty),
            unitCost: money(itemCost),
            batchNumber: item.batchNumber || null,
            expiryDate: item.expiryDate ? parseDay(item.expiryDate) : null,
          },
        });

        // Use core stock engine to increment stock level & record stock movement
        await stockIn(tx, {
          salonId: ctx.salonId,
          branchId: targetBranchId,
          productId: item.productId,
          quantity: itemQty,
          unitCost: itemCost,
          type: "PURCHASE_RECEIPT",
          referenceType: "GOODS_RECEIPT",
          referenceId: grn.id,
          reason: body.supplierInvoiceNo ? `Invoice: ${body.supplierInvoiceNo}` : "Goods receipt",
          userId: ctx.userId,
          batch: item.batchNumber || item.expiryDate ? {
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate ? parseDay(item.expiryDate) : null,
          } : null,
        });

        // If tied to PO, increment quantityReceived on the PO line
        if (item.poItemId && po) {
          await tx.purchaseOrderItem.update({
            where: { id: item.poItemId },
            data: { quantityReceived: { increment: qty(itemQty) } },
          });
        }
      }

      // Update PO status if applicable
      if (po) {
        const updatedItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: po.id },
          select: { quantityOrdered: true, quantityReceived: true },
        });

        const allReceived = updatedItems.every((it) => D(it.quantityReceived).greaterThanOrEqualTo(D(it.quantityOrdered)));
        const someReceived = updatedItems.some((it) => D(it.quantityReceived).greaterThan(0));

        const nextStatus = allReceived ? "RECEIVED" : someReceived ? "PARTIALLY_RECEIVED" : po.status;
        if (nextStatus !== po.status) {
          await tx.purchaseOrder.update({
            where: { id: po.id },
            data: { status: nextStatus },
          });
        }
      }

      await audit(tx, ctx, "GOODS_RECEIVED", "GoodsReceipt", grn.id, {
        newData: { receiptNumber, totalCost: money(totalCost), itemsCount: body.items.length },
        req,
      });

      return grn;
    },
    { timeout: 35000 }
  );

  return Response.json({ goodsReceipt: receipt }, { status: 201 });
});
