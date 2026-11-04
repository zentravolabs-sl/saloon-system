import { z } from "zod";

/** Money as string|number; at most 2 decimal places. Normalised to string. */
const moneyBase = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^-?\d+(\.\d{1,2})?$/.test(v), "Enter a valid amount (max 2 decimal places)");

export const moneyPositive = moneyBase.refine((v) => Number(v) > 0, "Amount must be greater than zero");
export const moneyNonNeg = moneyBase.refine((v) => Number(v) >= 0, "Amount cannot be negative");

/** Quantity with up to 3 decimals */
const qtyBase = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d+(\.\d{1,3})?$/.test(v), "Enter a valid quantity (max 3 decimal places)");
export const qtyPositive = qtyBase.refine((v) => Number(v) > 0, "Quantity must be greater than zero");
export const qtyNonNeg = qtyBase;

/** Percentage 0-100 with up to 4 decimals */
export const percentStr = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d+(\.\d{1,4})?$/.test(v) && Number(v) <= 100, "Enter a percentage between 0 and 100");

export const dayStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export const idStr = z.string().min(1).max(64);
export const optionalText = (max = 500) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null));

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

export const PAYMENT_METHODS = ["CASH", "CARD", "ONLINE", "BANK"] as const;
