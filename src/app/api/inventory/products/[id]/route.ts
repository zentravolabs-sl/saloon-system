import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError, allowedBranchIds, can } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";
import { money, sum, valuate } from "@/lib/money";
import { productUpdateSchema } from "@/lib/ops/inventory-schemas";
import { loadProduct } from "@/lib/ops/lookups";
import { readUpload, storeFile } from "@/lib/ops/files";

type P = { id: string };

export const GET = route<P>({ permission: ["inventory.view", "pos.sell"] }, async ({ ctx, params }) => {
  const product = await loadProduct(ctx, params.id);
  const branchIds = await allowedBranchIds(ctx);
  const canSeeCost = can(ctx.role, "inventory.view");
  const [levels, batches, recipes] = await Promise.all([
    prisma.stockLevel.findMany({
      where: { productId: product.id, branchId: { in: branchIds } },
      include: { branch: { select: { id: true, name: true } } },
    }),
    prisma.stockBatch.findMany({
      where: { productId: product.id, branchId: { in: branchIds }, quantity: { gt: 0 } },
      orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }],
    }),
    prisma.serviceProduct.findMany({
      where: { productId: product.id },
      include: { service: { select: { id: true, name: true } } },
    }),
  ]);
  return {
    product: { ...product, costPrice: canSeeCost ? product.costPrice : null },
    onHand: sum(levels.map((l) => l.quantity)).toFixed(3),
    stockValue: canSeeCost ? money(valuate(levels.map((l) => ({ ...l, fallbackCost: product.costPrice })))) : null,
    levels: levels.map((l) => ({ branchId: l.branchId, branchName: l.branch.name, quantity: l.quantity, avgCost: canSeeCost ? l.avgCost : null })),
    batches,
    usedInServices: recipes.map((r) => ({ serviceId: r.service.id, serviceName: r.service.name, quantity: r.quantity })),
  };
});

export const PATCH = route<P>({ permission: "inventory.manage", write: true }, async ({ ctx, req, params }) => {
  const existing = await loadProduct(ctx, params.id);
  const body = await parseBody(req, productUpdateSchema);

  if (body.categoryId) {
    const cat = await prisma.productCategory.findFirst({ where: { id: body.categoryId, salonId: ctx.salonId } });
    if (!cat) throw new ApiError(400, "Product category not found");
  }
  if (body.sku && body.sku.toLowerCase() !== existing.sku.toLowerCase()) {
    const dup = await prisma.product.findFirst({ where: { salonId: ctx.salonId, sku: { equals: body.sku, mode: "insensitive" }, NOT: { id: existing.id } } });
    if (dup) throw new ApiError(409, `SKU "${body.sku}" is already used by another product`);
  }
  if (body.barcode && body.barcode !== existing.barcode) {
    const dup = await prisma.product.findFirst({ where: { salonId: ctx.salonId, barcode: body.barcode, NOT: { id: existing.id } } });
    if (dup) throw new ApiError(409, `Barcode "${body.barcode}" is already used by another product`);
  }

  const data = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.brand !== undefined ? { brand: body.brand } : {}),
    ...(body.sku ? { sku: body.sku } : {}),
    ...(body.barcode !== undefined ? { barcode: body.barcode } : {}),
    ...(body.categoryId !== undefined ? { categoryId: body.categoryId || null } : {}),
    ...(body.unit !== undefined ? { unit: body.unit } : {}),
    ...(body.costPrice !== undefined ? { costPrice: money(body.costPrice) } : {}),
    ...(body.sellingPrice !== undefined ? { sellingPrice: money(body.sellingPrice) } : {}),
    ...(body.taxRate !== undefined ? { taxRate: String(body.taxRate) } : {}),
    ...(body.minStock !== undefined ? { minStock: body.minStock } : {}),
    ...(body.trackBatches !== undefined ? { trackBatches: body.trackBatches } : {}),
    ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
  };

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.update({ where: { id: existing.id }, data });
    await audit(tx, ctx, "PRODUCT_UPDATED", "Product", p.id, {
      oldData: { name: existing.name, sku: existing.sku, cost: existing.costPrice, price: existing.sellingPrice, isActive: existing.isActive },
      newData: { name: p.name, sku: p.sku, cost: p.costPrice, price: p.sellingPrice, isActive: p.isActive },
      req,
    });
    return p;
  });
  return { product };
});

/** Archive (soft delete). Products with history can never be hard-deleted. */
export const DELETE = route<P>({ permission: "inventory.manage", write: true }, async ({ ctx, req, params }) => {
  const existing = await loadProduct(ctx, params.id);
  const restore = new URL(req.url).searchParams.get("restore") === "1";
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: existing.id },
      data: restore ? { archivedAt: null, isActive: true } : { archivedAt: new Date(), isActive: false },
    });
    await audit(tx, ctx, restore ? "PRODUCT_RESTORED" : "PRODUCT_ARCHIVED", "Product", existing.id, { req });
  });
  return { ok: true };
});

/** Product image upload (multipart field "file") */
export const PUT = route<P>({ permission: "inventory.manage", write: true }, async ({ ctx, req, params }) => {
  const existing = await loadProduct(ctx, params.id);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "Expected multipart/form-data");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "No file provided");
  const upload = await readUpload(file, "PRODUCT_IMAGE");

  const result = await prisma.$transaction(async (tx) => {
    const stored = await storeFile(tx, ctx, "PRODUCT_IMAGE", upload);
    await tx.product.update({ where: { id: existing.id }, data: { imageFileId: stored.id } });
    if (existing.imageFileId) {
      await tx.storedFile.deleteMany({ where: { id: existing.imageFileId, salonId: ctx.salonId } });
    }
    await audit(tx, ctx, "PRODUCT_IMAGE_UPDATED", "Product", existing.id, { req });
    return stored;
  });
  return { imageFileId: result.id };
});
