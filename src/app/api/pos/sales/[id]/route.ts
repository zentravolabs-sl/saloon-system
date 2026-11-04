import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError, assertBranchAccess } from "@/lib/ops/access";
import { audit, userNames } from "@/lib/ops/audit";
import { D, money, qty } from "@/lib/money";
import { stockIn } from "@/lib/ops/inventory";
import { refundSaleSchema } from "@/lib/ops/pos-schemas";

type P = { id: string };

async function loadSale(ctx: any, id: string) {
  const sale = await prisma.sale.findFirst({
    where: { id, salonId: ctx.salonId },
    include: {
      branch: { select: { id: true, name: true } },
      customer: true,
      booking: true,
      items: { include: { product: true } },
      payments: true,
      refunds: { include: { items: true } },
      invoice: true,
    },
  });
  if (!sale) throw new ApiError(404, "Sale not found");
  await assertBranchAccess(ctx, sale.branchId);
  return sale;
}

export const GET = route<P>({ permission: ["pos.sell", "inventory.view"] }, async ({ ctx, params }) => {
  const sale = await loadSale(ctx, params.id);
  const names = await userNames([sale.createdById, sale.voidedById]);
  return { sale: { ...sale, createdByName: names[sale.createdById] || null } };
});

/** Process a refund on a completed sale */
export const POST = route<P>({ permission: "pos.refund", write: true }, async ({ ctx, req, params }) => {
  const sale = await loadSale(ctx, params.id);
  if (sale.status === "REFUNDED" || sale.status === "VOIDED") {
    throw new ApiError(409, "Sale is already fully refunded or voided");
  }

  const body = await parseBody(req, refundSaleSchema);
  const saleItemMap = new Map(sale.items.map((i) => [i.id, i]));

  let refundTotal = D(0);
  for (const item of body.items) {
    const saleItem = saleItemMap.get(item.saleItemId);
    if (!saleItem) throw new ApiError(400, `Sale item ${item.saleItemId} not found in this sale`);

    const alreadyRefunded = D(saleItem.refundedQuantity);
    const maxRefundable = D(saleItem.quantity).minus(alreadyRefunded);
    if (D(item.quantity).greaterThan(maxRefundable)) {
      throw new ApiError(
        400,
        `Cannot refund ${item.quantity} of ${saleItem.productName}. Maximum refundable: ${maxRefundable.toFixed(3)}`
      );
    }
    refundTotal = refundTotal.plus(D(item.amount));
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create SaleRefund record
    const refund = await tx.saleRefund.create({
      data: {
        saleId: sale.id,
        amount: money(refundTotal),
        method: body.method,
        reason: body.reason,
        createdById: ctx.userId,
        items: {
          create: body.items.map((it) => ({
            saleItemId: it.saleItemId,
            quantity: qty(D(it.quantity)),
            amount: money(D(it.amount)),
            restock: it.restock,
          })),
        },
      },
    });

    // 2. Adjust restocked inventory
    for (const item of body.items) {
      const saleItem = saleItemMap.get(item.saleItemId)!;
      await tx.saleItem.update({
        where: { id: saleItem.id },
        data: { refundedQuantity: { increment: qty(D(item.quantity)) } },
      });

      if (item.restock) {
        await stockIn(tx, {
          salonId: ctx.salonId,
          branchId: sale.branchId,
          productId: saleItem.productId,
          quantity: D(item.quantity),
          unitCost: D(saleItem.unitCost),
          type: "SALE_RETURN",
          referenceType: "SALE",
          referenceId: sale.saleNumber,
          reason: `Sale return (${body.reason})`,
          userId: ctx.userId,
          skipAverage: true,
        });
      }
    }

    // 3. Update sale totals & status
    const newRefundedAmount = D(sale.refundedAmount).plus(refundTotal);
    const allItemsRefunded = sale.items.every((it) => {
      const thisRefund = body.items.find((bi) => bi.saleItemId === it.id);
      const updatedRefunded = D(it.refundedQuantity).plus(thisRefund ? D(thisRefund.quantity) : D(0));
      return updatedRefunded.greaterThanOrEqualTo(D(it.quantity));
    });

    const nextStatus = allItemsRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED";

    await tx.sale.update({
      where: { id: sale.id },
      data: {
        refundedAmount: money(newRefundedAmount),
        status: nextStatus,
      },
    });

    // 4. Offset commissions generated for refunded items
    const commEntries = await tx.commissionEntry.findMany({
      where: { saleId: sale.id, status: { not: "VOIDED" } },
    });

    for (const comm of commEntries) {
      if (comm.saleItemId) {
        const refundedItem = body.items.find((bi) => bi.saleItemId === comm.saleItemId);
        if (refundedItem) {
          const adjKey = `ADJUSTMENT:REFUND:${comm.id}`;
          const existingAdj = await tx.commissionEntry.findUnique({ where: { sourceKey: adjKey } });
          if (!existingAdj) {
            // Negative adjustment for commission
            const refundRatio = D(refundedItem.amount).div(D(comm.baseAmount).isZero() ? 1 : D(comm.baseAmount));
            const commDeduction = D(comm.amount).times(refundRatio);

            await tx.commissionEntry.create({
              data: {
                salonId: ctx.salonId,
                branchId: sale.branchId,
                staffId: comm.staffId,
                source: "PRODUCT",
                sourceKey: adjKey,
                saleId: sale.id,
                saleItemId: comm.saleItemId,
                description: `Offset commission for refunded product (${body.reason})`,
                baseAmount: money(refundedItem.amount),
                rateType: comm.rateType,
                rateValue: comm.rateValue,
                amount: money(commDeduction.negated()),
                status: "APPROVED",
                earnedAt: new Date(),
                isAdjustment: true,
                adjustsEntryId: comm.id,
                notes: body.reason,
              },
            });
          }
        }
      }
    }

    await audit(tx, ctx, "SALE_REFUNDED", "Sale", sale.id, {
      newData: { refundAmount: money(refundTotal), reason: body.reason },
      req,
    });

    return refund;
  });

  return Response.json({ refund: result }, { status: 201 });
});
