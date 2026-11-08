import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { route, parseBody, parseQuery, csvResponse } from "@/lib/ops/api";
import { ApiError, allowedBranchIds, assertBranchAccess, resolveStockBranchForProduct } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";
import { getOpsSettings } from "@/lib/ops/settings";
import { D, money, sum } from "@/lib/money";
import { adjustStockTo, stockIn, stockOutMany } from "@/lib/ops/inventory";
import { stockOperationSchema } from "@/lib/ops/inventory-schemas";
import { loadProduct, loadSupplier } from "@/lib/ops/lookups";
import { parseDay } from "@/lib/ops/periods";
import { pageQuery } from "@/lib/ops/schemas";

const listQuery = pageQuery.extend({
  branchId: z.string().optional(),
  search: z.string().max(100).optional(),
  lowOnly: z.enum(["true", "false"]).optional(),
  export: z.enum(["csv"]).optional(),
});

/** Stock on hand per product per branch + valuation (inventory valuation report data) */
export const GET = route({ permission: "inventory.view" }, async ({ ctx, req }) => {
  const q = parseQuery(req, listQuery);
  const branchIds = q.branchId ? [await assertBranchAccess(ctx, q.branchId)] : await allowedBranchIds(ctx);

  const where: Prisma.StockLevelWhereInput = {
    branchId: { in: branchIds },
    salonId: ctx.salonId,
    product: {
      archivedAt: null,
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: "insensitive" } },
              { sku: { contains: q.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  };

  const levels = await prisma.stockLevel.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true, minStock: true, costPrice: true, isActive: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: [{ product: { name: "asc" } }],
  });

  let rows = levels.map((l) => {
    const cost = D(l.avgCost).greaterThan(0) ? D(l.avgCost) : D(l.product.costPrice);
    const qtyPos = D(l.quantity).greaterThan(0) ? D(l.quantity) : D(0);
    return {
      productId: l.productId,
      productName: l.product.name,
      sku: l.product.sku,
      unit: l.product.unit,
      branchId: l.branchId,
      branchName: l.branch.name,
      quantity: D(l.quantity).toFixed(3),
      minStock: D(l.product.minStock).toFixed(3),
      avgCost: cost.toFixed(4),
      value: money(qtyPos.times(cost)),
      isLow: D(l.product.minStock).greaterThan(0) && D(l.quantity).lessThanOrEqualTo(D(l.product.minStock)),
    };
  });
  if (q.lowOnly === "true") rows = rows.filter((r) => r.isLow);

  const totalValue = sum(rows.map((r) => r.value));

  if (q.export === "csv") {
    return csvResponse("inventory-valuation.csv", [
      ["Branch", "SKU", "Product", "Unit", "Quantity", "Avg cost", "Value", "Min stock"],
      ...rows.map((r) => [r.branchName, r.sku, r.productName, r.unit, r.quantity, r.avgCost, r.value, r.minStock]),
      [],
      ["TOTAL VALUE", "", "", "", "", "", money(totalValue)],
    ]);
  }
  const start = (q.page - 1) * q.limit;
  return {
    rows: rows.slice(start, start + q.limit),
    total: rows.length,
    page: q.page,
    limit: q.limit,
    totalValue: money(totalValue),
  };
});

/** Manual stock-in / stock-out / adjustment. Always writes a movement. */
export const POST = route({ permission: "inventory.manage", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, stockOperationSchema);
  const product = await loadProduct(ctx, body.productId);
  if (product.archivedAt) throw new ApiError(409, "Product is archived");
  const branchId = await resolveStockBranchForProduct(ctx, product.id, body.branchId);
  const settings = await getOpsSettings(ctx.salonId);

  await prisma.$transaction(
    async (tx) => {
      if (body.operation === "IN") {
        let supplierLabel: string | null = body.supplierName || null;
        if (body.supplierId) {
          const sup = await loadSupplier(ctx, body.supplierId);
          supplierLabel = sup.name;
        }
        const unitCostDec = body.unitCost !== undefined ? D(body.unitCost) : D(product.costPrice);
        const baseReason = body.reason || "New Purchase";
        const fullReason = supplierLabel ? `${baseReason} (${supplierLabel})` : baseReason;

        await stockIn(tx, {
          salonId: ctx.salonId,
          branchId,
          productId: product.id,
          quantity: D(body.quantity),
          unitCost: unitCostDec,
          type: "MANUAL_IN",
          referenceType: "MANUAL",
          reason: fullReason,
          userId: ctx.userId,
          batch: { batchNumber: body.batchNumber, expiryDate: body.expiryDate ? parseDay(body.expiryDate) : null },
        });

        // Update product default costPrice if a positive purchase cost was entered
        if (body.unitCost !== undefined && unitCostDec.greaterThan(0)) {
          await tx.product.update({
            where: { id: product.id },
            data: { costPrice: money(unitCostDec) },
          });
        }
      } else if (body.operation === "OUT") {
        await stockOutMany(
          tx,
          {
            salonId: ctx.salonId,
            branchId,
            type: "MANUAL_OUT",
            referenceType: "MANUAL",
            reason: body.reason,
            userId: ctx.userId,
            allowNegative: settings.allowNegativeStock,
          },
          [{ productId: product.id, quantity: D(body.quantity) }]
        );
      } else {
        await adjustStockTo(tx, {
          salonId: ctx.salonId,
          branchId,
          productId: product.id,
          newQuantity: D(body.newQuantity),
          reason: body.reason,
          userId: ctx.userId,
          fallbackCost: D(product.costPrice),
        });
      }
      await audit(tx, ctx, `STOCK_${body.operation}`, "Product", product.id, {
        metadata: {
          branchId,
          quantity: body.operation === "ADJUST" ? body.newQuantity : body.quantity,
          reason: body.reason ?? null,
        },
        req,
      });
    },
    { timeout: 30000 }
  );

  const allBranchIds = await allowedBranchIds(ctx);
  const levels = await prisma.stockLevel.findMany({
    where: { productId: product.id, branchId: { in: allBranchIds } },
    select: { quantity: true },
  });
  const totalQty = sum(levels.map((l) => l.quantity));
  return { quantity: totalQty.toFixed(3) };
});
