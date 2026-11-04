import { z } from "zod";
import { dayStr, idStr, moneyNonNeg, moneyPositive, optionalText, percentStr, qtyPositive } from "@/lib/ops/schemas";

export const saleItemSchema = z.object({
  productId: idStr,
  quantity: qtyPositive,
  unitPrice: moneyNonNeg,
  discountAmount: moneyNonNeg.default("0"),
  staffId: idStr.optional().nullable(),
});

export const salePaymentSchema = z.object({
  amount: moneyPositive,
  method: z.enum(["CASH", "CARD", "ONLINE", "BANK"]).default("CASH"),
  reference: optionalText(100),
});

export const createSaleSchema = z.object({
  branchId: idStr,
  customerId: idStr.optional().nullable(),
  bookingId: idStr.optional().nullable(),
  staffId: idStr.optional().nullable(), // primary seller
  notes: optionalText(500),
  idempotencyKey: z.string().trim().max(100).optional().nullable(),
  items: z.array(saleItemSchema).min(1, "At least one product item is required").max(100),
  payments: z.array(salePaymentSchema).optional().default([]),
});

export const refundItemSchema = z.object({
  saleItemId: idStr,
  quantity: qtyPositive,
  amount: moneyPositive,
  restock: z.boolean().default(true),
});

export const refundSaleSchema = z.object({
  reason: z.string().trim().min(2, "A refund reason is required").max(300),
  method: z.enum(["CASH", "CARD", "ONLINE", "BANK"]).default("CASH"),
  items: z.array(refundItemSchema).min(1, "At least one item must be refunded"),
});
