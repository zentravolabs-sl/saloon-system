import { Prisma } from "@/generated/prisma/client";
import { D, Decimal, money, round2 } from "@/lib/money";
import { monthRange } from "@/lib/ops/periods";
import { ApiError } from "@/lib/ops/access";

export type Tx = Prisma.TransactionClient;

export interface StaffCalculationInput {
  staffId: string;
  daysWorked?: string | number | null;
  hoursWorked?: string | number | null;
  overtimeHours?: string | number | null;
  bonuses?: { amount: string | number; reason: string }[];
  deductions?: { amount: string | number; reason: string }[];
  includeCommissions?: boolean;
  recoverAdvances?: boolean;
}

export interface CalculatedPayrollItem {
  staffId: string;
  staffName: string;
  primaryBranchId: string;
  salaryType: any;
  baseRate: Decimal;
  daysWorked: Decimal;
  hoursWorked: Decimal;
  overtimeHours: Decimal;
  basicAmount: Decimal;
  overtimeAmount: Decimal;
  commissionAmount: Decimal;
  bonusAmount: Decimal;
  deductionAmount: Decimal;
  advanceDeduction: Decimal;
  grossAmount: Decimal;
  netAmount: Decimal;
  calculationBreakdown: any;
  eligibleCommissions: { id: string; amount: Decimal }[];
  advanceRecoveries: { advanceId: string; amount: Decimal }[];
  bonuses: { amount: Decimal; reason: string }[];
  deductions: { amount: Decimal; reason: string }[];
}

/**
 * Calculates payroll components for a staff member without writing changes to the DB.
 */
export async function calculateStaffPayroll(
  tx: Tx,
  salonId: string,
  year: number,
  month: number,
  input: StaffCalculationInput
): Promise<CalculatedPayrollItem> {
  const staff = await tx.staff.findFirst({
    where: { id: input.staffId, salonId },
    include: {
      compensation: true,
      primaryBranch: true,
      branches: true,
    },
  });
  if (!staff) throw new ApiError(404, `Staff ${input.staffId} not found`);

  const primaryBranchId =
    staff.primaryBranchId || (staff.branches.length > 0 ? staff.branches[0].branchId : null);
  if (!primaryBranchId) {
    throw new ApiError(400, `Staff member ${staff.name} is not assigned to any branch`);
  }

  const comp = staff.compensation;
  const salaryType = comp?.salaryType || "FIXED_MONTHLY";
  const baseRate = D(comp?.baseAmount || 0);

  const daysWorked = D(input.daysWorked || 0);
  const hoursWorked = D(input.hoursWorked || 0);
  const overtimeHours = D(input.overtimeHours || 0);

  // 1. Calculate Basic Amount based on salary type
  let basicAmount = D(0);
  if (salaryType === "FIXED_MONTHLY") {
    basicAmount = baseRate;
  } else if (salaryType === "DAILY") {
    basicAmount = round2(baseRate.times(daysWorked));
  } else if (salaryType === "HOURLY") {
    basicAmount = round2(baseRate.times(hoursWorked));
  } else if (salaryType === "COMMISSION_ONLY") {
    basicAmount = D(0);
  } else if (salaryType === "BASIC_PLUS_COMMISSION") {
    basicAmount = baseRate;
  }

  // 2. Overtime calculation
  let overtimeAmount = D(0);
  if (comp?.overtimeEnabled && overtimeHours.greaterThan(0)) {
    const otRate = D(comp.overtimeRate);
    overtimeAmount = round2(otRate.times(overtimeHours));
  }

  // 3. Approved commissions for the month (not yet tied to any payroll record)
  const { start: periodStart, end: periodEnd } = monthRange(year, month);
  let commissionAmount = D(0);
  let eligibleCommissions: { id: string; amount: Decimal }[] = [];

  if (input.includeCommissions !== false) {
    const comms = await tx.commissionEntry.findMany({
      where: {
        staffId: staff.id,
        salonId,
        status: "APPROVED",
        payrollRecordId: null,
        earnedAt: {
          gte: periodStart,
          lte: new Date(Date.UTC(year, month - 1, periodEnd.getUTCDate(), 23, 59, 59, 999)),
        },
      },
      select: { id: true, amount: true },
    });

    eligibleCommissions = comms.map((c) => ({ id: c.id, amount: D(c.amount) }));
    commissionAmount = eligibleCommissions.reduce((acc, c) => acc.plus(c.amount), D(0));
  }

  // 4. Bonuses
  const bonuses = (input.bonuses || []).map((b) => ({ amount: D(b.amount), reason: b.reason }));
  const bonusAmount = bonuses.reduce((acc, b) => acc.plus(b.amount), D(0));

  // Gross Amount = Basic + Overtime + Commissions + Bonuses
  const grossAmount = basicAmount.plus(overtimeAmount).plus(commissionAmount).plus(bonusAmount);

  // 5. Standard Deductions
  const deductions = (input.deductions || []).map((d) => ({ amount: D(d.amount), reason: d.reason }));
  const deductionAmount = deductions.reduce((acc, d) => acc.plus(d.amount), D(0));

  // 6. Salary Advances Recovery
  let advanceDeduction = D(0);
  const advanceRecoveries: { advanceId: string; amount: Decimal }[] = [];

  if (input.recoverAdvances !== false) {
    const outstandingAdvances = await tx.staffAdvance.findMany({
      where: {
        staffId: staff.id,
        salonId,
        status: "OUTSTANDING",
      },
      orderBy: { advanceDate: "asc" },
    });

    let remainingPayable = grossAmount.minus(deductionAmount);
    if (remainingPayable.lessThan(0)) remainingPayable = D(0);

    for (const adv of outstandingAdvances) {
      const remainingOnAdv = D(adv.amount).minus(D(adv.recoveredAmount));
      if (remainingOnAdv.lessThanOrEqualTo(0)) continue;

      let deductionForAdv = remainingOnAdv;
      if (adv.installmentAmount && D(adv.installmentAmount).greaterThan(0)) {
        deductionForAdv = Decimal.min(deductionForAdv, D(adv.installmentAmount));
      }

      // Cap at remaining payable so salary doesn't drop below 0 if not allowed
      deductionForAdv = Decimal.min(deductionForAdv, remainingPayable);

      if (deductionForAdv.greaterThan(0)) {
        advanceRecoveries.push({ advanceId: adv.id, amount: deductionForAdv });
        advanceDeduction = advanceDeduction.plus(deductionForAdv);
        remainingPayable = remainingPayable.minus(deductionForAdv);
      }
    }
  }

  // 7. Final Net Amount
  const netAmount = grossAmount.minus(deductionAmount).minus(advanceDeduction);

  const calculationBreakdown = {
    salaryType,
    baseRate: money(baseRate),
    daysWorked: daysWorked.toFixed(2),
    hoursWorked: hoursWorked.toFixed(2),
    overtimeHours: overtimeHours.toFixed(2),
    basicAmount: money(basicAmount),
    overtimeAmount: money(overtimeAmount),
    commissionAmount: money(commissionAmount),
    bonusAmount: money(bonusAmount),
    deductionAmount: money(deductionAmount),
    advanceDeduction: money(advanceDeduction),
    grossAmount: money(grossAmount),
    netAmount: money(netAmount),
  };

  return {
    staffId: staff.id,
    staffName: staff.name,
    primaryBranchId,
    salaryType,
    baseRate,
    daysWorked,
    hoursWorked,
    overtimeHours,
    basicAmount,
    overtimeAmount,
    commissionAmount,
    bonusAmount,
    deductionAmount,
    advanceDeduction,
    grossAmount,
    netAmount,
    calculationBreakdown,
    eligibleCommissions,
    advanceRecoveries,
    bonuses,
    deductions,
  };
}
