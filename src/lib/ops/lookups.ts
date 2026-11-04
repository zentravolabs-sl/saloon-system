import { prisma } from "@/lib/prisma";
import { ApiError, type AccessContext } from "@/lib/ops/access";

/** Tenant-scoped loaders: a record from another salon is indistinguishable from "not found" */
export async function loadProduct(ctx: AccessContext, id: string) {
  const p = await prisma.product.findFirst({ where: { id, salonId: ctx.salonId } });
  if (!p) throw new ApiError(404, "Product not found");
  return p;
}

export async function loadSupplier(ctx: AccessContext, id: string) {
  const s = await prisma.supplier.findFirst({ where: { id, salonId: ctx.salonId } });
  if (!s) throw new ApiError(404, "Supplier not found");
  return s;
}

export async function loadService(ctx: AccessContext, id: string) {
  const s = await prisma.service.findFirst({ where: { id, salonId: ctx.salonId } });
  if (!s) throw new ApiError(404, "Service not found");
  return s;
}

export async function assertProductsInSalon(ctx: AccessContext, productIds: string[]) {
  const unique = Array.from(new Set(productIds));
  const found = await prisma.product.findMany({
    where: { id: { in: unique }, salonId: ctx.salonId },
    select: { id: true, name: true, isActive: true, archivedAt: true, costPrice: true, sellingPrice: true, taxRate: true, sku: true, trackBatches: true },
  });
  if (found.length !== unique.length) throw new ApiError(400, "One or more products were not found");
  return new Map(found.map((p) => [p.id, p]));
}
