import { prisma } from "@/lib/prisma";
import { route } from "@/lib/ops/api";
import { allowedBranchIds, resolveDefaultBranchId } from "@/lib/ops/access";
import { D, money, sum } from "@/lib/money";
import { addDays, todayInTz } from "@/lib/ops/periods";

/** Low-stock and expiry alerts for the salon (aggregated per product for single-location clarity) */
export const GET = route({ permission: "inventory.view" }, async ({ ctx }) => {
  const branchIds = await allowedBranchIds(ctx);
  const defaultBranchId = await resolveDefaultBranchId(ctx);
  const today = todayInTz();
  const soon = addDays(today, 30);

  const [products, batches] = await Promise.all([
    prisma.product.findMany({
      where: { salonId: ctx.salonId, isActive: true, archivedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        stockLevels: {
          where: { branchId: { in: branchIds } },
          select: { branchId: true, quantity: true, branch: { select: { name: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.stockBatch.findMany({
      where: { branchId: { in: branchIds }, quantity: { gt: 0 }, expiryDate: { not: null, lte: soon } },
      include: {
        product: { select: { name: true, sku: true, unit: true } },
        branch: { select: { name: true } },
      },
      orderBy: { expiryDate: "asc" },
      take: 200,
    }),
  ]);

  const lowStock = products
    .map((p) => {
      const currentQty = sum(p.stockLevels.map((l) => l.quantity));
      const minQty = D(p.minStock);
      const isOut = currentQty.lessThanOrEqualTo(0);
      const isLow = isOut || (minQty.greaterThan(0) && currentQty.lessThanOrEqualTo(minQty));
      if (!isLow) return null;

      // Critical if out of stock (<= 0) or at/below 30% of minimum threshold (or <= 1 when min >= 3)
      const isCritical =
        isOut ||
        (minQty.greaterThan(0) && currentQty.lessThanOrEqualTo(minQty.times(0.4))) ||
        (minQty.greaterThanOrEqualTo(3) && currentQty.lessThanOrEqualTo(1));

      const primaryBranch = p.stockLevels[0]?.branch?.name || "Main Location";
      const primaryBranchId = p.stockLevels[0]?.branchId || defaultBranchId;

      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        unit: p.unit,
        categoryName: p.category?.name || "Uncategorized",
        costPrice: money(p.costPrice),
        branchId: primaryBranchId,
        branchName: primaryBranch,
        quantity: currentQty.toFixed(3),
        minStock: minQty.toFixed(3),
        shortage: minQty.greaterThan(currentQty) ? minQty.minus(currentQty).toFixed(3) : "0.000",
        severity: isCritical ? ("CRITICAL" as const) : ("LOW" as const),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => Number(a.quantity) - Number(b.quantity));

  const expiring = batches.map((b) => ({
    batchId: b.id,
    productName: b.product.name,
    sku: b.product.sku,
    branchName: b.branch.name,
    batchNumber: b.batchNumber,
    quantity: D(b.quantity).toFixed(3),
    expiryDate: b.expiryDate,
    expired: !!b.expiryDate && b.expiryDate.getTime() < today.getTime(),
  }));
  return { lowStock, expiring };
});
