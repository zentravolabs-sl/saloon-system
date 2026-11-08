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
  limit: z.coerce.number().int().min(1).max(500).default(100),
  branchId: z.string().optional(),
  productId: z.string().optional(),
  type: z.enum(STOCK_TYPES).optional(),
  reason: z.string().max(100).optional(),
  from: dayStr.optional(),
  to: dayStr.optional(),
  export: z.enum(["csv"]).optional(),
});

function formatSimpleReason(type: string, reason?: string | null): string {
  const r = (reason || "").trim();
  const rLow = r.toLowerCase();
  if (type === "SERVICE_CONSUMPTION" || rLow.startsWith("service consumption") || rLow === "used in salon") {
    return "Used in salon";
  }
  if (type === "PURCHASE_RECEIPT" || rLow.startsWith("new purchase") || rLow === "purchased" || rLow.startsWith("initial supplier")) {
    return r || "Purchased";
  }
  if (type === "SALE") return "Sold to customer";
  if (type === "SALE_RETURN") return "Customer return";
  if (type === "CONSUMPTION_REVERSAL") return "Service cancelled (returned)";
  if (r) return r;
  if (type === "MANUAL_IN") return "Purchased";
  if (type === "MANUAL_OUT") return "Used in salon";
  if (type === "ADJUSTMENT") return "Stock Correction";
  return "Stock update";
}

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
    product: { select: { id: true, name: true, sku: true, unit: true } },
    branch: { select: { name: true } },
    batch: { select: { batchNumber: true, expiryDate: true } },
  } satisfies Prisma.StockMovementInclude;

  if (q.export === "csv") {
    const rows = await prisma.stockMovement.findMany({ where, include, orderBy: { createdAt: "desc" }, take: 20000 });
    const names = await userNames(rows.map((r) => r.createdById));
    return csvResponse("stock-movements.csv", [
      ["Date", "SKU", "Product", "Change", "Unit", "Balance after", "Reason", "By"],
      ...rows.map((r) => [
        r.createdAt.toISOString(), r.product.sku, r.product.name,
        String(r.quantity), r.product.unit, String(r.balanceAfter),
        formatSimpleReason(r.type, r.reason), r.createdById ? names[r.createdById] || "" : "",
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
  let mapped = movements.map((m) => ({
    ...m,
    displayReason: formatSimpleReason(m.type, m.reason),
    createdByName: m.createdById ? names[m.createdById] || null : null,
  }));

  if (q.reason && q.reason !== "ALL") {
    const target = q.reason.toLowerCase();
    mapped = mapped.filter(
      (m) =>
        m.displayReason.toLowerCase().includes(target) ||
        (m.reason && m.reason.toLowerCase().includes(target))
    );
  }

  return {
    movements: mapped,
    total: q.reason && q.reason !== "ALL" ? mapped.length : total,
    page: q.page,
    limit: q.limit,
  };
});
