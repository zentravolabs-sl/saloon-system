import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { route, parseQuery, csvResponse } from "@/lib/ops/api";
import { assertStaffAccess, branchWhere, can } from "@/lib/ops/access";
import { userNames } from "@/lib/ops/audit";
import { money } from "@/lib/money";
import { pageQuery } from "@/lib/ops/schemas";
import { ApiError } from "@/lib/ops/access";

const query = pageQuery.extend({
  branchId: z.string().optional(),
  staffId: z.string().optional(),
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().optional(),
  status: z.enum(["DRAFT", "APPROVED", "PAID", "VOIDED"]).optional(),
  export: z.enum(["csv"]).optional(),
});

export const GET = route({ permission: ["payroll.view", "payroll.view_own"] }, async ({ ctx, req }) => {
  const q = parseQuery(req, query);

  let staffIdFilter = q.staffId;
  if (!can(ctx.role, "payroll.view")) {
    if (!ctx.staffId) throw new ApiError(403, "No staff profile linked to your user account");
    staffIdFilter = ctx.staffId;
  }

  const where: Prisma.PayrollRecordWhereInput = {
    salonId: ctx.salonId,
    ...(await branchWhere(ctx, q.branchId)),
    ...(staffIdFilter ? { staffId: staffIdFilter } : {}),
    ...(q.year ? { periodYear: q.year } : {}),
    ...(q.month ? { periodMonth: q.month } : {}),
    ...(q.status ? { status: q.status } : {}),
  };

  const include = {
    branch: { select: { id: true, name: true } },
    staff: { select: { id: true, name: true, photo: true } },
  } satisfies Prisma.PayrollRecordInclude;

  const take = q.export === "csv" ? 10000 : q.limit;
  const [records, total] = await Promise.all([
    prisma.payrollRecord.findMany({
      where,
      include,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
      skip: q.export === "csv" ? 0 : (q.page - 1) * q.limit,
      take,
    }),
    prisma.payrollRecord.count({ where }),
  ]);

  if (q.export === "csv") {
    return csvResponse("payroll-records.csv", [
      ["Payslip", "Period", "Branch", "Staff", "Basic", "Overtime", "Commissions", "Gross", "Deductions", "Advance Deducted", "Net Payable", "Status"],
      ...records.map((r) => [
        r.payslipNumber,
        `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}`,
        r.branch.name,
        r.staffName,
        money(r.basicAmount),
        money(r.overtimeAmount),
        money(r.commissionAmount),
        money(r.grossAmount),
        money(r.deductionAmount),
        money(r.advanceDeduction),
        money(r.netAmount),
        r.status,
      ]),
    ]);
  }

  const names = await userNames(records.flatMap((r) => [r.generatedById, r.approvedById, r.paidById]));

  return {
    records: records.map((r) => ({
      ...r,
      generatedByName: names[r.generatedById] || null,
      approvedByName: r.approvedById ? names[r.approvedById] || null : null,
      paidByName: r.paidById ? names[r.paidById] || null : null,
    })),
    total,
    page: q.page,
    limit: q.limit,
    canApprove: can(ctx.role, "payroll.approve"),
    canPay: can(ctx.role, "payroll.pay"),
  };
});
