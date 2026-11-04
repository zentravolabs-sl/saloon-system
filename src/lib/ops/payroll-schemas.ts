import { z } from "zod";
import { dayStr, idStr, moneyNonNeg, moneyPositive, optionalText, qtyNonNeg } from "@/lib/ops/schemas";

export const compensationSchema = z.object({
  staffId: idStr,
  salaryType: z.enum(["FIXED_MONTHLY", "DAILY", "HOURLY", "COMMISSION_ONLY", "BASIC_PLUS_COMMISSION"]).default("FIXED_MONTHLY"),
  baseAmount: moneyNonNeg.default("0"),
  overtimeEnabled: z.boolean().default(false),
  overtimeRate: moneyNonNeg.default("0"),
  standardHoursPerDay: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).default("8"),
  notes: optionalText(500),
});

export const advanceSchema = z.object({
  staffId: idStr,
  branchId: idStr.optional().nullable(),
  amount: moneyPositive,
  advanceDate: dayStr,
  reason: optionalText(300),
  installmentAmount: moneyPositive.optional().nullable(),
});

export const generatePayrollSchema = z.object({
  branchId: idStr,
  year: z.coerce.number().int().min(2020).max(2050),
  month: z.coerce.number().int().min(1).max(12),
  staffInputs: z
    .array(
      z.object({
        staffId: idStr,
        daysWorked: qtyNonNeg.optional().default("0"),
        hoursWorked: qtyNonNeg.optional().default("0"),
        overtimeHours: qtyNonNeg.optional().default("0"),
        bonuses: z.array(z.object({ amount: moneyPositive, reason: z.string().trim().min(1) })).optional().default([]),
        deductions: z.array(z.object({ amount: moneyPositive, reason: z.string().trim().min(1) })).optional().default([]),
        includeCommissions: z.boolean().default(true),
        recoverAdvances: z.boolean().default(true),
      })
    )
    .min(1, "Select at least one staff member to generate payroll"),
});

export const recordPaymentSchema = z.object({
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "OTHER"]).default("BANK_TRANSFER"),
  paymentReference: optionalText(100),
  notes: optionalText(500),
});
