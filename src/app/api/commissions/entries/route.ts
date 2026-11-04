import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { route, parseBody, parseQuery, csvResponse } from "@/lib/ops/api";
import { ApiError, assertBranchAccess, assertStaffAccess, branchWhere, can } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";
import { D, money, sum } from "@/lib/money";
import { commissionAdjustmentSchema } from "@/lib/ops/commission-schemas";
import { dayStr, pageQuery } from "@/lib/ops/schemas";
import { endOfDayUTC, parseDay } from "@/lib/ops/periods";

const query = pageQuery.extend({
  staffId: z.string().optional(),
  branchId: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "PAID", "VOIDED"]).optional(),
  source: z.enum(["SERVICE", "PRODUCT"]).optional(),
  from: dayStr.optional(),
  to: dayStr.optional(),
  export: z.enum(["csv"]).optional(),
});

export const GET = route({ permission: ["commission.view", "commission.view_own"] }, async ({ ctx, req }) => {
  const q = parseQuery(req, query);

  // If user can only view their own commissions (STAFF / RECEPTIONIST)
  let staffIdFilter = q.staffId;
  if (!can(ctx.role, "commission.view")) {
    if (!ctx.staffId) throw new ApiError(403, "No staff profile linked to your user account");
    staffIdFilter = ctx.staffId;
  }

  const where: Prisma.CommissionEntryWhereInput = {
    salonId: ctx.salonId,
    ...(await branchWhere(ctx, q.branchId)),
    ...(staffIdFilter ? { staffId: staffIdFilter } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.source ? { source: q.source } : {}),
    ...(q.from || q.to
      ? {
          earnedAt: {
            ...(q.from ? { gte: parseDay(q.from) } : {}),
            ...(q.to ? { lte: endOfDayUTC(parseDay(q.to)) } : {}),
          },
        }
      : {}),
  };

  const include = {
    staff: { select: { id: true, name: true } },
    branch: { select: { id: true, name: true } },
    booking: { select: { id: true, reference: true } },
  } satisfies Prisma.CommissionEntryInclude;

  const take = q.export === "csv" ? 10000 : q.limit;
  const [entries, total, aggregates] = await Promise.all([
    prisma.commissionEntry.findMany({
      where,
      include,
      orderBy: { earnedAt: "desc" },
      skip: q.export === "csv" ? 0 : (q.page - 1) * q.limit,
      take,
    }),
    prisma.commissionEntry.count({ where }),
    prisma.commissionEntry.groupBy({
      by: ["status"],
      where,
      _sum: { amount: true },
    }),
  ]);

  if (q.export === "csv") {
    return csvResponse("commissions.csv", [
      ["Date", "Staff", "Branch", "Source", "Description", "Base Amount", "Rate", "Commission", "Status"],
      ...entries.map((e) => [
        e.earnedAt.toISOString().slice(0, 10),
        e.staff.name,
        e.branch.name,
        e.source,
        e.description,
        money(e.baseAmount),
        e.rateType === "PERCENTAGE" ? `${e.rateValue}%` : money(e.rateValue),
        money(e.amount),
        e.status,
      ]),
    ]);
  }

  const statusSums = Object.fromEntries(aggregates.map((a) => [a.status, money(a._sum.amount || 0)]));

  return {
    entries,
    total,
    page: q.page,
    limit: q.limit,
    totals: {
      pending: statusSums["PENDING"] || "0.00",
      approved: statusSums["APPROVED"] || "0.00",
      paid: statusSums["PAID"] || "0.00",
      voided: statusSums["VOIDED"] || "0.00",
    },
    canManage: can(ctx.role, "commission.manage"),
  };
});

/** Create manual commission adjustment */
export const POST = route({ permission: "commission.manage", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, commissionAdjustmentSchema);
  await assertBranchAccess(ctx, body.branchId);
  const staff = await assertStaffAccess(ctx, body.staffId);

  const amount = D(body.amount);
  if (amount.isZero()) throw new ApiError(400, "Adjustment amount cannot be zero");

  const entry = await prisma.$transaction(async (tx) => {
    const adjKey = `MANUAL_ADJUSTMENT:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    const created = await tx.commissionEntry.create({
      data: {
        salonId: ctx.salonId,
        branchId: body.branchId,
        staffId: staff.id,
        source: "SERVICE", // generic category
        sourceKey: adjKey,
        description: body.description,
        baseAmount: money(amount.abs()),
        rateType: "FIXED_AMOUNT",
        rateValue: money(amount.abs()),
        amount: money(amount),
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: ctx.userId,
        earnedAt: new Date(),
        isAdjustment: true,
        notes: body.notes || null,
      },
    });

    await audit(tx, ctx, "COMMISSION_ADJUSTMENT", "CommissionEntry", created.id, {
      newData: { staff: staff.name, amount: money(amount), description: body.description },
      req,
    });
    return created;
  });

  return Response.json({ entry }, { status: 201 });
});
