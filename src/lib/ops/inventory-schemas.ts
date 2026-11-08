import { z } from "zod";
import { dayStr, idStr, moneyNonNeg, moneyPositive, optionalText, percentStr, qtyNonNeg, qtyPositive } from "@/lib/ops/schemas";

export const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(150),
  description: optionalText(1000),
  brand: optionalText(80),
  sku: z.string().trim().max(60).optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
  barcode: z.string().trim().max(60).optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
  categoryId: z.string().trim().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
  unit: z.string().trim().min(1).max(20).default("bottle"),
  costPrice: moneyNonNeg.default("0"),
  sellingPrice: moneyNonNeg.default("0"),
  taxRate: percentStr.default("0"),
  minStock: qtyNonNeg.default("0"),
  lowStockAlert: qtyNonNeg.optional(),
  currentStock: qtyNonNeg.optional(),
  trackBatches: z.boolean().default(false),
  isActive: z.boolean().default(true),
  openingStock: z
    .array(
      z.object({
        branchId: idStr.optional().nullable(),
        quantity: qtyPositive,
        unitCost: moneyNonNeg.optional(),
      })
    )
    .optional(),
});

export const productUpdateSchema = productSchema.omit({ openingStock: true, currentStock: true }).partial();

export const stockOperationSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("IN"),
    branchId: idStr.optional().nullable(),
    productId: idStr,
    quantity: qtyPositive,
    unitCost: moneyNonNeg.optional(),
    supplierId: z.string().trim().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
    supplierName: optionalText(150),
    batchNumber: optionalText(60),
    expiryDate: z.string().trim().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
    reason: optionalText(300),
  }),
  z.object({
    operation: z.literal("OUT"),
    branchId: idStr.optional().nullable(),
    productId: idStr,
    quantity: qtyPositive,
    reason: z.string().trim().min(2, "A reason is required").max(300),
  }),
  z.object({
    operation: z.literal("ADJUST"),
    branchId: idStr.optional().nullable(),
    productId: idStr,
    newQuantity: qtyNonNeg,
    reason: z.string().trim().min(2, "A reason is required").max(300),
  }),
]);

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Supplier name is required").max(150),
  contactPerson: optionalText(100),
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  address: optionalText(300),
  notes: optionalText(1000),
  isActive: z.boolean().default(true),
});

export const poItemSchema = z.object({
  productId: idStr,
  quantityOrdered: qtyPositive,
  unitCost: moneyNonNeg,
  taxRate: percentStr.default("0"),
});

export const poCreateSchema = z.object({
  branchId: idStr,
  supplierId: idStr,
  expectedDate: dayStr.optional().nullable(),
  notes: optionalText(1000),
  items: z.array(poItemSchema).min(1, "Add at least one item").max(200),
  placeOrder: z.boolean().default(false),
});

export const poUpdateSchema = z.object({
  supplierId: idStr.optional(),
  expectedDate: dayStr.optional().nullable(),
  notes: optionalText(1000),
  items: z.array(poItemSchema).min(1).max(200).optional(),
});

export const receiptSchema = z.object({
  purchaseOrderId: idStr.optional().nullable(),
  branchId: idStr.optional(),
  supplierId: idStr.optional().nullable(),
  supplierInvoiceNo: optionalText(80),
  notes: optionalText(500),
  items: z
    .array(
      z.object({
        productId: idStr,
        poItemId: idStr.optional().nullable(),
        quantity: qtyPositive,
        unitCost: moneyNonNeg,
        batchNumber: optionalText(60),
        expiryDate: dayStr.optional().nullable(),
      })
    )
    .min(1, "Add at least one received item")
    .max(200),
});

export const transferSchema = z.object({
  fromBranchId: idStr,
  toBranchId: idStr,
  notes: optionalText(300),
  items: z.array(z.object({ productId: idStr, quantity: qtyPositive })).min(1).max(200),
});

export const serviceProductsSchema = z.object({
  serviceId: idStr,
  items: z.array(z.object({ productId: idStr, quantity: qtyPositive })).max(30),
});

export { moneyPositive };
