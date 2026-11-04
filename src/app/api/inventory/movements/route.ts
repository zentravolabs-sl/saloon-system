import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { route, parseQuery, csvResponse } from "@/lib/ops/api";
import { branchWhere } from "@/lib/ops/access";
import { userNames } from "@/lib/ops/audit";
import { endOfDayUTC, parseDay } from "@/lib/ops/periods";
import { dayStr, pageQuery } from "@/lib/ops/schemas";

const STOCK_TYPES = [
  "PURCHASE_RECEIPT", "MANUAL_IN", "MANUAL_OUT", "ADJUSTMENT", "TRANSFER_IN", "TRANSFER_OUT",
  "SALE", "SALE_RETURN", "SERVICE_CONSUMPTION", "CONSUMPTION_REVERSAL",
] as const;

const query = pageQuery.extend({
  branchId: z.string().optional(),
  productId: z.string().optional(),
  type: z.enum(STOCK_TYPES).optional(),
  from: dayStr.optional(),
  to: dayStr.optional(),
  export: z.enum(["csv"]).optional(),
});

/** Stock movement history (the audit trail of every quantity change) */
export const GET = route({ permission: "inventory.view" }, async ({ ctx, req }) => {
  const q = parseQuery(req, query);
  const where: Prisma.StockMovementWhereInput = {
    salonId: ctx.salonId,
    ...(await branchWhere(ctx, q.branchId)),
    ...(q.productId ? { productId: q.productId } : {}),
    ...(q.type ? { type: q.type } : {}),
    ...(q.from || q.to
      ? {
          createdAt: {
            ...(q.from ? { gte: parseDay(q.from) } : {}),
            ...(q.to ? { lte: endOfDayUTC(parseDay(q.to)) } : {}),
          },
        }
      : {}),
  };
  const include = {
    product: { select: { name: true, sku: true, unit: true } },
    branch: { select: { name: true } },
    batch: { select: { batchNumber: true, expiryDate: true } },
  } satisfies Prisma.StockMovementInclude;

  if (q.export === "csv") {
    const rows = await prisma.stockMovement.findMany({ where, include, orderBy: { createdAt: "desc" }, take: 20000 });
    const names = await userNames(rows.map((r) => r.createdById));
    return csvResponse("stock-movements.csv", [
      ["Date", "Branch", "SKU", "Product", "Type", "Quantity", "Balance after", "Unit cost", "Batch", "Reference", "Reason", "By"],
      ...rows.map((r) => [
        r.createdAt.toISOString(), r.branch.name, r.product.sku, r.product.name, r.type,
        String(r.quantity), String(r.balanceAfter), r.unitCost ? String(r.unitCost) : "",
        r.batch?.batchNumber, r.referenceType ? `${r.referenceType}:${r.referenceId ?? ""}` : "",
        r.reason, r.createdById ? names[r.createdById] || "" : "",
      ]),
    ]);
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where, include, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.limit, take: q.limit,
    }),
    prisma.stockMovement.count({ where }),
  ]);
  const names = await userNames(movements.map((m) => m.createdById));
  return {
    movements: movements.map((m) => ({ ...m, createdByName: m.createdById ? names[m.createdById] || null : null })),
    total, page: q.page, limit: q.limit,
  };
});
