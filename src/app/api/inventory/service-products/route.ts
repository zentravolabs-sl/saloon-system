import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { audit } from "@/lib/ops/audit";
import { qty } from "@/lib/money";
import { serviceProductsSchema } from "@/lib/ops/inventory-schemas";
import { assertProductsInSalon, loadService } from "@/lib/ops/lookups";
import { ApiError } from "@/lib/ops/access";

/** Service product-consumption recipe. GET ?serviceId=… or all services with recipes. */
export const GET = route({ permission: ["inventory.view"] }, async ({ ctx, req }) => {
  const serviceId = new URL(req.url).searchParams.get("serviceId");
  if (serviceId) await loadService(ctx, serviceId);
  const items = await prisma.serviceProduct.findMany({
    where: { service: { salonId: ctx.salonId, ...(serviceId ? { id: serviceId } : {}) } },
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
      service: { select: { id: true, name: true } },
    },
    orderBy: { service: { name: "asc" } },
  });
  return { items };
});

/** Replaces the recipe of one service (idempotent PUT semantics) */
export const PUT = route({ permission: "inventory.manage", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, serviceProductsSchema);
  await loadService(ctx, body.serviceId);
  const ids = body.items.map((i) => i.productId);
  if (new Set(ids).size !== ids.length) throw new ApiError(400, "A product can appear only once per service");
  await assertProductsInSalon(ctx, ids);

  await prisma.$transaction(async (tx) => {
    await tx.serviceProduct.deleteMany({ where: { serviceId: body.serviceId } });
    if (body.items.length > 0) {
      await tx.serviceProduct.createMany({
        data: body.items.map((i) => ({ serviceId: body.serviceId, productId: i.productId, quantity: qty(i.quantity) })),
      });
    }
    await audit(tx, ctx, "SERVICE_RECIPE_UPDATED", "Service", body.serviceId, {
      newData: body.items,
      req,
    });
  });
  return { ok: true };
});
