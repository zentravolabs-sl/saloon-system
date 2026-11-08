import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { route, parseBody, parseQuery, csvResponse } from "@/lib/ops/api";
import { ApiError, allowedBranchIds, assertBranchAccess, can, resolveDefaultBranchId } from "@/lib/ops/access";
import { audit, nextNumber } from "@/lib/ops/audit";
import { D, money, sum, valuate } from "@/lib/money";
import { stockIn } from "@/lib/ops/inventory";
import { productSchema } from "@/lib/ops/inventory-schemas";
import { pageQuery } from "@/lib/ops/schemas";

const listQuery = pageQuery.extend({
  limit: z.coerce.number().int().min(1).max(500).default(200),
  search: z.string().max(100).optional(),
  categoryId: z.string().optional(),
  branchId: z.string().optional(),
  status: z.enum(["active", "inactive", "archived", "all"]).default("active"),
  sellable: z.enum(["true", "false"]).optional(),
  export: z.enum(["csv"]).optional(),
});

/** Products with branch-aware stock. Used by inventory screens AND the POS product search. */
export const GET = route({ permission: ["inventory.view", "pos.sell"] }, async ({ ctx, req }) => {
  const q = parseQuery(req, listQuery);
  const branchIds = q.branchId
    ? [await assertBranchAccess(ctx, q.branchId)]
    : await allowedBranchIds(ctx);

  const where: Prisma.ProductWhereInput = {
    salonId: ctx.salonId,
    ...(q.status === "active" ? { isActive: true, archivedAt: null } : {}),
    ...(q.status === "inactive" ? { isActive: false, archivedAt: null } : {}),
    ...(q.status === "archived" ? { archivedAt: { not: null } } : {}),
    ...(q.categoryId ? { categoryId: q.categoryId } : {}),
    ...(q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: "insensitive" } },
            { sku: { contains: q.search, mode: "insensitive" } },
            { barcode: { equals: q.search } },
            { brand: { contains: q.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const take = q.export === "csv" ? 20000 : q.limit;
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        stockLevels: { where: { branchId: { in: branchIds } }, select: { branchId: true, quantity: true, avgCost: true } },
      },
      orderBy: { name: "asc" },
      skip: q.export === "csv" ? 0 : (q.page - 1) * q.limit,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  const canSeeCost = can(ctx.role, "inventory.view");
  const items = products.map((p) => {
    const onHand = sum(p.stockLevels.map((s) => s.quantity));
    const value = valuate(p.stockLevels.map((s) => ({ ...s, fallbackCost: p.costPrice })));
    const minStockDec = D(p.minStock);
    const isOut = onHand.lessThanOrEqualTo(0);
    const isLow = !isOut && minStockDec.greaterThan(0) && onHand.lessThanOrEqualTo(minStockDec);
    const { stockLevels, ...rest } = p;
    return {
      ...rest,
      // Purchase cost and valuation are confidential from sell-only roles
      costPrice: canSeeCost ? rest.costPrice : null,
      onHand: onHand.toFixed(3),
      stockValue: canSeeCost ? money(value) : null,
      isOut,
      isLow: onHand.lessThanOrEqualTo(minStockDec) && minStockDec.greaterThan(0),
      stockStatus: isOut ? "OUT_OF_STOCK" : isLow ? "LOW_STOCK" : "IN_STOCK",
      branchStock: stockLevels.map((s) => ({ branchId: s.branchId, quantity: s.quantity })),
    };
  });

  if (q.export === "csv") {
    return csvResponse("products.csv", [
      ["SKU", "Name", "Brand", "Barcode", "Unit", "Cost", "Price", "Tax %", "Min stock", "On hand", "Stock value"],
      ...items.map((i) => [i.sku, i.name, i.brand, i.barcode, i.unit, money(i.costPrice), money(i.sellingPrice), String(i.taxRate), String(i.minStock), i.onHand, i.stockValue]),
    ]);
  }

  return { products: items, total, page: q.page, limit: q.limit, canManage: can(ctx.role, "inventory.manage") };
});

export const POST = route({ permission: "inventory.manage", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, productSchema);

  if (body.categoryId) {
    const cat = await prisma.productCategory.findFirst({ where: { id: body.categoryId, salonId: ctx.salonId } });
    if (!cat) throw new ApiError(400, "Product category not found");
  }

  const defaultBranchId = await resolveDefaultBranchId(ctx);
  const openingEntries: { branchId: string; quantity: string; unitCost?: string }[] = [];

  if (body.openingStock && body.openingStock.length > 0) {
    for (const s of body.openingStock) {
      const bId = s.branchId ? await assertBranchAccess(ctx, s.branchId) : defaultBranchId;
      openingEntries.push({ branchId: bId, quantity: s.quantity, unitCost: s.unitCost });
    }
  } else if (body.currentStock && D(body.currentStock).greaterThan(0)) {
    openingEntries.push({
      branchId: defaultBranchId,
      quantity: body.currentStock,
      unitCost: body.costPrice,
    });
  }

  const effectiveMinStock = body.lowStockAlert !== undefined ? body.lowStockAlert : body.minStock;

  const product = await prisma.$transaction(
    async (tx) => {
      const sku = body.sku || (await nextNumber(tx, ctx.salonId, "SKU", "SKU", 5));
      const dup = await tx.product.findFirst({ where: { salonId: ctx.salonId, sku: { equals: sku, mode: "insensitive" } } });
      if (dup) throw new ApiError(409, `SKU "${sku}" is already used by another product`);
      if (body.barcode) {
        const bdup = await tx.product.findFirst({ where: { salonId: ctx.salonId, barcode: body.barcode } });
        if (bdup) throw new ApiError(409, `Barcode "${body.barcode}" is already used by another product`);
      }

      const created = await tx.product.create({
        data: {
          salonId: ctx.salonId,
          name: body.name,
          description: body.description,
          brand: body.brand,
          sku,
          barcode: body.barcode,
          categoryId: body.categoryId || null,
          unit: body.unit,
          costPrice: money(body.costPrice),
          sellingPrice: money(body.sellingPrice),
          taxRate: String(body.taxRate),
          minStock: effectiveMinStock,
          trackBatches: body.trackBatches,
          isActive: body.isActive,
        },
      });

      for (const s of openingEntries) {
        await stockIn(tx, {
          salonId: ctx.salonId,
          branchId: s.branchId,
          productId: created.id,
          quantity: D(s.quantity),
          unitCost: D(s.unitCost ?? body.costPrice),
          type: "MANUAL_IN",
          referenceType: "MANUAL",
          reason: "Opening stock",
          userId: ctx.userId,
        });
      }
      await audit(tx, ctx, "PRODUCT_CREATED", "Product", created.id, {
        newData: { name: created.name, sku: created.sku, cost: created.costPrice, price: created.sellingPrice },
        req,
      });
      return created;
    },
    { timeout: 30000 }
  );
  return Response.json({ product }, { status: 201 });
});
