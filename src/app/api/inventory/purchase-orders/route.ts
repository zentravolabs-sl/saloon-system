import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { route, parseBody, parseQuery, csvResponse } from "@/lib/ops/api";
import { ApiError, assertBranchAccess, branchWhere } from "@/lib/ops/access";
import { audit, nextNumber, userNames } from "@/lib/ops/audit";
import { D, money, qty } from "@/lib/money";
import { poCreateSchema } from "@/lib/ops/inventory-schemas";
import { assertProductsInSalon, loadSupplier } from "@/lib/ops/lookups";
import { parseDay } from "@/lib/ops/periods";
import { pageQuery } from "@/lib/ops/schemas";

const listQuery = pageQuery.extend({
  branchId: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.enum(["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]).optional(),
  search: z.string().max(100).optional(),
  export: z.enum(["csv"]).optional(),
});

export const GET = route({ permission: ["po.manage", "inventory.view"] }, async ({ ctx, req }) => {
  const q = parseQuery(req, listQuery);
  const where: Prisma.PurchaseOrderWhereInput = {
    salonId: ctx.salonId,
    ...(await branchWhere(ctx, q.branchId)),
    ...(q.supplierId ? { supplierId: q.supplierId } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.search
      ? {
          OR: [
            { poNumber: { contains: q.search, mode: "insensitive" } },
            { supplier: { name: { contains: q.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const include = {
    supplier: { select: { id: true, name: true, phone: true } },
    branch: { select: { id: true, name: true } },
    items: {
      include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
    },
    receipts: { select: { id: true, receiptNumber: true, receivedAt: true, totalCost: true } },
  } satisfies Prisma.PurchaseOrderInclude;

  const take = q.export === "csv" ? 10000 : q.limit;
  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      skip: q.export === "csv" ? 0 : (q.page - 1) * q.limit,
      take,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  if (q.export === "csv") {
    return csvResponse("purchase-orders.csv", [
      ["PO Number", "Date", "Branch", "Supplier", "Status", "Subtotal", "Tax", "Total Amount"],
      ...orders.map((po) => [
        po.poNumber,
        po.orderDate.toISOString().slice(0, 10),
        po.branch.name,
        po.supplier.name,
        po.status,
        money(po.subtotal),
        money(po.taxAmount),
        money(po.totalAmount),
      ]),
    ]);
  }

  const names = await userNames(orders.map((o) => o.createdById));
  return {
    orders: orders.map((o) => ({ ...o, createdByName: names[o.createdById] || null })),
    total,
    page: q.page,
    limit: q.limit,
  };
});

export const POST = route({ permission: "po.manage", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, poCreateSchema);
  await assertBranchAccess(ctx, body.branchId);
  const supplier = await loadSupplier(ctx, body.supplierId);
  await assertProductsInSalon(ctx, body.items.map((i) => i.productId));

  let subtotal = D(0);
  let taxAmount = D(0);
  const lines = body.items.map((item) => {
    const q = D(item.quantityOrdered);
    const cost = D(item.unitCost);
    const taxRate = D(item.taxRate || 0);
    const lineSubtotal = q.times(cost);
    const lineTax = lineSubtotal.times(taxRate).div(100);
    subtotal = subtotal.plus(lineSubtotal);
    taxAmount = taxAmount.plus(lineTax);
    return {
      productId: item.productId,
      quantityOrdered: qty(q),
      quantityReceived: qty(0),
      unitCost: money(cost),
      taxRate: String(taxRate),
    };
  });
  const totalAmount = subtotal.plus(taxAmount);

  const po = await prisma.$transaction(async (tx) => {
    const poNumber = await nextNumber(tx, ctx.salonId, "PO", "PO", 5);
    const created = await tx.purchaseOrder.create({
      data: {
        salonId: ctx.salonId,
        branchId: body.branchId,
        supplierId: supplier.id,
        poNumber,
        status: body.placeOrder ? "ORDERED" : "DRAFT",
        orderedAt: body.placeOrder ? new Date() : null,
        expectedDate: body.expectedDate ? parseDay(body.expectedDate) : null,
        notes: body.notes,
        subtotal: money(subtotal),
        taxAmount: money(taxAmount),
        totalAmount: money(totalAmount),
        createdById: ctx.userId,
        items: {
          create: lines,
        },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    await audit(tx, ctx, body.placeOrder ? "PO_ORDERED" : "PO_CREATED", "PurchaseOrder", created.id, {
      newData: { poNumber, supplier: supplier.name, totalAmount: money(totalAmount) },
      req,
    });
    return created;
  });

  return Response.json({ purchaseOrder: po }, { status: 201 });
});
