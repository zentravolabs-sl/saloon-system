import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";

const schema = z.object({ name: z.string().trim().min(2).max(60) });

const DEFAULT_PRODUCT_CATEGORIES = [
  "Shampoo",
  "Conditioner",
  "Hair Color",
  "Developer",
  "Hair Treatment",
  "Styling",
  "Skin & Facial",
  "Wax & Consumables",
];

export const GET = route({ permission: ["inventory.view", "pos.sell"] }, async ({ ctx }) => {
  let categories = await prisma.productCategory.findMany({
    where: { salonId: ctx.salonId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  if (categories.length === 0) {
    await prisma.productCategory.createMany({
      data: DEFAULT_PRODUCT_CATEGORIES.map((name) => ({
        salonId: ctx.salonId,
        name,
        isActive: true,
      })),
      skipDuplicates: true,
    });
    categories = await prisma.productCategory.findMany({
      where: { salonId: ctx.salonId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
  }

  return { categories };
});

export const POST = route({ permission: "inventory.manage", write: true }, async ({ ctx, req }) => {
  const { name } = await parseBody(req, schema);
  const exists = await prisma.productCategory.findFirst({
    where: { salonId: ctx.salonId, name: { equals: name, mode: "insensitive" } },
  });
  if (exists) throw new ApiError(409, "A category with this name already exists");
  const category = await prisma.$transaction(async (tx) => {
    const c = await tx.productCategory.create({ data: { salonId: ctx.salonId, name } });
    await audit(tx, ctx, "PRODUCT_CATEGORY_CREATED", "ProductCategory", c.id, { newData: { name }, req });
    return c;
  });
  return Response.json({ category }, { status: 201 });
});

export const DELETE = route({ permission: "inventory.manage", write: true }, async ({ ctx, req }) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new ApiError(400, "id is required");
  const cat = await prisma.productCategory.findFirst({
    where: { id, salonId: ctx.salonId },
    include: { _count: { select: { products: true } } },
  });
  if (!cat) throw new ApiError(404, "Category not found");
  if (cat._count.products > 0) throw new ApiError(409, "Category still has products. Move or archive them first.");
  await prisma.$transaction(async (tx) => {
    await tx.productCategory.delete({ where: { id } });
    await audit(tx, ctx, "PRODUCT_CATEGORY_DELETED", "ProductCategory", id, { oldData: { name: cat.name }, req });
  });
  return { ok: true };
});
