import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { route, parseBody, parseQuery, csvResponse } from "@/lib/ops/api";
import { ApiError, assertBranchAccess, branchWhere } from "@/lib/ops/access";
import { audit, nextNumber, userNames } from "@/lib/ops/audit";
import { D, money, qty, rate4, round2 } from "@/lib/money";
import { stockOutMany } from "@/lib/ops/inventory";
import { createSaleSchema } from "@/lib/ops/pos-schemas";
import { assertProductsInSalon } from "@/lib/ops/lookups";
import { getOpsSettings } from "@/lib/ops/settings";
import { findBestCommissionRule } from "@/lib/ops/commission";
import { pageQuery } from "@/lib/ops/schemas";
import { format } from "date-fns";

const query = pageQuery.extend({
  branchId: z.string().optional(),
  customerId: z.string().optional(),
  staffId: z.string().optional(),
  status: z.enum(["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED", "VOIDED"]).optional(),
  search: z.string().max(100).optional(),
  export: z.enum(["csv"]).optional(),
});

export const GET = route({ permission: ["pos.sell", "inventory.view"] }, async ({ ctx, req }) => {
  const q = parseQuery(req, query);
  const where: Prisma.SaleWhereInput = {
    salonId: ctx.salonId,
    ...(await branchWhere(ctx, q.branchId)),
    ...(q.customerId ? { customerId: q.customerId } : {}),
    ...(q.staffId ? { staffId: q.staffId } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.search
      ? {
          OR: [
            { saleNumber: { contains: q.search, mode: "insensitive" } },
            { customer: { name: { contains: q.search, mode: "insensitive" } } },
            { customer: { phone: { contains: q.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const include = {
    branch: { select: { id: true, name: true } },
    customer: { select: { id: true, name: true, phone: true } },
    booking: { select: { id: true, reference: true } },
    items: {
      include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
    },
    payments: true,
    invoice: { select: { id: true, invoiceNumber: true } },
  } satisfies Prisma.SaleInclude;

  const take = q.export === "csv" ? 10000 : q.limit;
  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      skip: q.export === "csv" ? 0 : (q.page - 1) * q.limit,
      take,
    }),
    prisma.sale.count({ where }),
  ]);

  if (q.export === "csv") {
    return csvResponse("pos-sales.csv", [
      ["Sale Number", "Date", "Branch", "Customer", "Subtotal", "Discount", "Tax", "Total", "Paid", "Status"],
      ...sales.map((s) => [
        s.saleNumber,
        s.createdAt.toISOString().slice(0, 10),
        s.branch.name,
        s.customer?.name || "Walk-in",
        money(s.subtotal),
        money(s.discountAmount),
        money(s.taxAmount),
        money(s.totalAmount),
        money(s.paidAmount),
        s.status,
      ]),
    ]);
  }

  const names = await userNames(sales.map((s) => s.createdById));
  return {
    sales: sales.map((s) => ({ ...s, createdByName: names[s.createdById] || null })),
    total,
    page: q.page,
    limit: q.limit,
  };
});

export const POST = route({ permission: "pos.sell", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, createSaleSchema);
  await assertBranchAccess(ctx, body.branchId);

  // Idempotency check: if provided, check if already recorded
  if (body.idempotencyKey) {
    const existing = await prisma.sale.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
      include: { items: true, payments: true, invoice: true },
    });
    if (existing) {
      if (existing.salonId !== ctx.salonId) throw new ApiError(403, "Forbidden");
      return Response.json({ sale: existing, duplicate: true });
    }
  }

  const productMap = await assertProductsInSalon(ctx, body.items.map((i) => i.productId));
  const settings = await getOpsSettings(ctx.salonId);

  // Calculate totals
  let subtotal = D(0);
  let totalDiscount = D(0);
  let totalTax = D(0);

  const lines = body.items.map((it) => {
    const p = productMap.get(it.productId)!;
    const q = D(it.quantity);
    const unitPrice = D(it.unitPrice);
    const lineDiscount = D(it.discountAmount || 0);
    const taxRate = D(p.taxRate || 0);

    const gross = q.times(unitPrice);
    const net = gross.minus(lineDiscount);
    const tax = net.times(taxRate).div(100);
    const lineTotal = net.plus(tax);

    subtotal = subtotal.plus(gross);
    totalDiscount = totalDiscount.plus(lineDiscount);
    totalTax = totalTax.plus(tax);

    return {
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      quantity: q,
      unitPrice,
      discountAmount: lineDiscount,
      taxRate,
      taxAmount: tax,
      lineTotal,
      staffId: it.staffId || body.staffId || null,
    };
  });

  const totalAmount = subtotal.minus(totalDiscount).plus(totalTax);
  const totalPaid = body.payments.reduce((acc, pay) => acc.plus(D(pay.amount)), D(0));
  const paymentStatus =
    totalPaid.greaterThanOrEqualTo(totalAmount)
      ? "PAID"
      : totalPaid.greaterThan(0)
      ? "PARTIAL"
      : "UNPAID";

  const sale = await prisma.$transaction(
    async (tx) => {
      const saleNumber = await nextNumber(tx, ctx.salonId, "SALE", "POS", 5);

      // Deduct inventory atomically through core stock engine
      const stockOutResults = await stockOutMany(
        tx,
        {
          salonId: ctx.salonId,
          branchId: body.branchId,
          type: "SALE",
          referenceType: "SALE",
          referenceId: saleNumber,
          reason: `Retail sale ${saleNumber}`,
          userId: ctx.userId,
          allowNegative: settings.allowNegativeStock,
        },
        lines.map((l) => ({ productId: l.productId, quantity: l.quantity }))
      );

      // Create Sale record
      const createdSale = await tx.sale.create({
        data: {
          salonId: ctx.salonId,
          branchId: body.branchId,
          saleNumber,
          customerId: body.customerId || null,
          bookingId: body.bookingId || null,
          staffId: body.staffId || null,
          status: "COMPLETED",
          paymentStatus: paymentStatus as any,
          subtotal: money(subtotal),
          discountAmount: money(totalDiscount),
          taxAmount: money(totalTax),
          totalAmount: money(totalAmount),
          paidAmount: money(totalPaid),
          notes: body.notes,
          idempotencyKey: body.idempotencyKey || null,
          createdById: ctx.userId,
          items: {
            create: lines.map((l) => {
              const stockRes = stockOutResults.get(l.productId);
              return {
                productId: l.productId,
                productName: l.productName,
                sku: l.sku,
                quantity: qty(l.quantity),
                unitPrice: money(l.unitPrice),
                discountAmount: money(l.discountAmount),
                taxRate: String(l.taxRate),
                taxAmount: money(l.taxAmount),
                lineTotal: money(l.lineTotal),
                unitCost: rate4(stockRes?.unitCost || 0),
                staffId: l.staffId,
              };
            }),
          },
          payments: {
            create: body.payments.map((p) => ({
              amount: money(D(p.amount)),
              method: p.method,
              reference: p.reference,
            })),
          },
        },
        include: { items: true, payments: true },
      });

      // Update customer stats if linked
      if (body.customerId) {
        await tx.customer.update({
          where: { id: body.customerId },
          data: { totalSpent: { increment: Number(money(totalPaid)) } },
        });
      }

      // Generate invoice record (linked to saleId)
      const dateStr = format(new Date(), "yyyyMMdd");
      const invRand = Math.random().toString(36).substring(2, 6).toUpperCase();
      const invoiceNumber = `INV-POS-${dateStr}-${invRand}`;

      await tx.invoice.create({
        data: {
          invoiceNumber,
          saleId: createdSale.id,
          salonId: ctx.salonId,
          subtotal: Number(money(subtotal)),
          discountAmount: Number(money(totalDiscount)),
          taxAmount: Number(money(totalTax)),
          totalAmount: Number(money(totalAmount)),
          paidAmount: Number(money(totalPaid)),
          balanceAmount: Math.max(0, Number(money(totalAmount.minus(totalPaid)))),
        },
      });

      // Staff Commission evaluation for product sales
      // Evaluated if paymentStatus === "PAID" or if eligibility is COMPLETED
      const isEligiblePayment =
        settings.commissionEligibility === "COMPLETED" ||
        (settings.commissionEligibility === "COMPLETED_AND_PAID" && paymentStatus === "PAID");

      if (isEligiblePayment) {
        for (const item of createdSale.items) {
          const sellerStaffId = item.staffId;
          if (!sellerStaffId) continue;

          const rule = await findBestCommissionRule(tx, {
            salonId: ctx.salonId,
            branchId: body.branchId,
            staffId: sellerStaffId,
            source: "PRODUCT",
            productId: item.productId,
          });

          if (rule) {
            const baseAmount = settings.commissionOnNet ? D(item.lineTotal) : D(item.quantity).times(D(item.unitPrice));
            let commAmount = D(0);
            if (rule.type === "PERCENTAGE") {
              commAmount = round2(baseAmount.times(rule.value).div(100));
            } else {
              commAmount = round2(rule.value.times(D(item.quantity)));
            }

            if (commAmount.greaterThan(0)) {
              await tx.commissionEntry.create({
                data: {
                  salonId: ctx.salonId,
                  branchId: body.branchId,
                  staffId: sellerStaffId,
                  source: "PRODUCT",
                  sourceKey: `SALE_ITEM:${item.id}`,
                  saleId: createdSale.id,
                  saleItemId: item.id,
                  description: `Commission for sale of ${item.productName} (${saleNumber})`,
                  baseAmount: money(baseAmount),
                  rateType: rule.type,
                  rateValue: rate4(rule.value),
                  amount: money(commAmount),
                  status: settings.commissionAutoApprove ? "APPROVED" : "PENDING",
                  approvedAt: settings.commissionAutoApprove ? new Date() : null,
                  earnedAt: new Date(),
                  ruleId: rule.ruleId,
                },
              });
            }
          }
        }
      }

      await audit(tx, ctx, "SALE_COMPLETED", "Sale", createdSale.id, {
        newData: { saleNumber, total: money(totalAmount), items: createdSale.items.length },
        req,
      });

      return createdSale;
    },
    { timeout: 35000 }
  );

  return Response.json({ sale }, { status: 201 });
});
