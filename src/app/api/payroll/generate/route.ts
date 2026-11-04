import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { assertBranchAccess } from "@/lib/ops/access";
import { audit, nextNumber } from "@/lib/ops/audit";
import { money, qty } from "@/lib/money";
import { calculateStaffPayroll } from "@/lib/ops/payroll";
import { generatePayrollSchema } from "@/lib/ops/payroll-schemas";
import { monthRange } from "@/lib/ops/periods";
import { ApiError } from "@/lib/ops/access";

export const POST = route({ permission: "payroll.manage", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, generatePayrollSchema);
  await assertBranchAccess(ctx, body.branchId);

  // Check if period is closed
  const period = await prisma.payrollPeriod.findUnique({
    where: { salonId_year_month: { salonId: ctx.salonId, year: body.year, month: body.month } },
  });
  if (period?.status === "CLOSED") {
    throw new ApiError(409, `Payroll period ${body.year}-${body.month} is closed and cannot be modified`);
  }

  const { start: periodStart, end: periodEnd } = monthRange(body.year, body.month);

  const results = await prisma.$transaction(
    async (tx) => {
      const generatedRecords = [];

      for (const input of body.staffInputs) {
        // Prevent duplicate generation: check if active (non-voided) record exists
        const existing = await tx.payrollRecord.findFirst({
          where: {
            staffId: input.staffId,
            periodYear: body.year,
            periodMonth: body.month,
            status: { not: "VOIDED" },
          },
        });
        if (existing) {
          throw new ApiError(
            409,
            `Active payroll record already exists for staff member for period ${body.year}-${body.month} (${existing.payslipNumber})`
          );
        }

        // Calculate all values using payroll engine
        const calc = await calculateStaffPayroll(tx, ctx.salonId, body.year, body.month, input);

        const payslipNumber = await nextNumber(tx, ctx.salonId, "PAYSLIP", `PAY-${body.year}${String(body.month).padStart(2, "0")}`, 4);

        const record = await tx.payrollRecord.create({
          data: {
            salonId: ctx.salonId,
            branchId: body.branchId,
            staffId: calc.staffId,
            payslipNumber,
            periodYear: body.year,
            periodMonth: body.month,
            periodStart,
            periodEnd,
            staffName: calc.staffName,
            salaryType: calc.salaryType,
            baseRate: money(calc.baseRate),
            daysWorked: qty(calc.daysWorked),
            hoursWorked: qty(calc.hoursWorked),
            overtimeHours: qty(calc.overtimeHours),
            basicAmount: money(calc.basicAmount),
            overtimeAmount: money(calc.overtimeAmount),
            commissionAmount: money(calc.commissionAmount),
            bonusAmount: money(calc.bonusAmount),
            deductionAmount: money(calc.deductionAmount),
            advanceDeduction: money(calc.advanceDeduction),
            grossAmount: money(calc.grossAmount),
            netAmount: money(calc.netAmount),
            calculation: calc.calculationBreakdown,
            status: "DRAFT",
            generatedById: ctx.userId,
            adjustments: {
              create: [
                ...calc.bonuses.map((b) => ({
                  type: "BONUS" as const,
                  amount: money(b.amount),
                  reason: b.reason,
                  createdById: ctx.userId,
                })),
                ...calc.deductions.map((d) => ({
                  type: "DEDUCTION" as const,
                  amount: money(d.amount),
                  reason: d.reason,
                  createdById: ctx.userId,
                })),
              ],
            },
            advanceRecoveries: {
              create: calc.advanceRecoveries.map((adv) => ({
                advanceId: adv.advanceId,
                amount: money(adv.amount),
                applied: false,
              })),
            },
          },
        });

        // Link eligible commission entries to this payroll record
        if (calc.eligibleCommissions.length > 0) {
          await tx.commissionEntry.updateMany({
            where: { id: { in: calc.eligibleCommissions.map((c) => c.id) } },
            data: { payrollRecordId: record.id },
          });
        }

        generatedRecords.push(record);
      }

      await audit(tx, ctx, "PAYROLL_GENERATED", "PayrollRecord", null, {
        newData: { year: body.year, month: body.month, branchId: body.branchId, recordsCount: generatedRecords.length },
        req,
      });

      return generatedRecords;
    },
    { timeout: 40000 }
  );

  return Response.json({ records: results }, { status: 201 });
});
