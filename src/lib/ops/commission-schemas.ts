import { z } from "zod";
import { idStr, moneyPositive, percentStr } from "@/lib/ops/schemas";

export const commissionRuleSchema = z.object({
  branchId: idStr.optional().nullable(),
  staffId: idStr.optional().nullable(),
  source: z.enum(["SERVICE", "PRODUCT"]),
  serviceId: idStr.optional().nullable(),
  productId: idStr.optional().nullable(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).default("PERCENTAGE"),
  value: z.union([percentStr, moneyPositive]),
  isActive: z.boolean().default(true),
});

export const commissionRuleUpdateSchema = commissionRuleSchema.partial();

export const commissionAdjustmentSchema = z.object({
  staffId: idStr,
  branchId: idStr,
  amount: z.union([z.string(), z.number()]).transform((v) => String(v).trim()), // can be positive or negative
  description: z.string().trim().min(2).max(300),
  notes: z.string().trim().max(500).optional().nullable(),
});
