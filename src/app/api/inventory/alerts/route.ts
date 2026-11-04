import { prisma } from "@/lib/prisma";
import { route } from "@/lib/ops/api";
import { allowedBranchIds } from "@/lib/ops/access";
import { D } from "@/lib/money";
import { addDays, todayInTz } from "@/lib/ops/periods";

/** Low-stock and expiry alerts for the caller's branches */
export const GET = route({ permission: "inventory.view" }, async ({ ctx }) => {
  const branchIds = await allowedBranchIds(ctx);
  const today = todayInTz();
  const soon = addDays(today, 30);

  const [levels, batches] = await Promise.all([
    prisma.stockLevel.findMany({
      where: { branchId: { in: branchIds }, product: { isActive: true, archivedAt: null, minStock: { gt: 0 } } },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true, minStock: true } },
        branch: { select: { id: true, name: true } },
      },
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

  const lowStock = levels
    .filter((l) => D(l.quantity).lessThanOrEqualTo(D(l.product.minStock)))
    .map((l) => ({
      productId: l.productId,
      productName: l.product.name,
      sku: l.product.sku,
      unit: l.product.unit,
      branchId: l.branchId,
      branchName: l.branch.name,
      quantity: D(l.quantity).toFixed(3),
      minStock: D(l.product.minStock).toFixed(3),
    }));

  // Products with minStock>0 that have never had a stock row are also "out of stock"
  const covered = new Set(levels.map((l) => `${l.productId}:${l.branchId}`));
  const watched = await prisma.product.findMany({
    where: { salonId: ctx.salonId, isActive: true, archivedAt: null, minStock: { gt: 0 } },
    select: { id: true, name: true, sku: true, unit: true, minStock: true },
  });
  const branches = await prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } });
  for (const p of watched) {
    for (const b of branches) {
      if (!covered.has(`${p.id}:${b.id}`)) {
        lowStock.push({
          productId: p.id, productName: p.name, sku: p.sku, unit: p.unit,
          branchId: b.id, branchName: b.name, quantity: "0.000", minStock: D(p.minStock).toFixed(3),
        });
      }
    }
  }

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
