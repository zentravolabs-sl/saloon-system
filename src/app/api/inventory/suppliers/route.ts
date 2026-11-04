import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { route, parseBody, parseQuery, csvResponse } from "@/lib/ops/api";
import { ApiError } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";
import { supplierSchema } from "@/lib/ops/inventory-schemas";
import { pageQuery } from "@/lib/ops/schemas";

const query = pageQuery.extend({
  search: z.string().max(100).optional(),
  active: z.enum(["true", "false"]).optional(),
  export: z.enum(["csv"]).optional(),
});

export const GET = route({ permission: ["supplier.manage", "inventory.view"] }, async ({ ctx, req }) => {
  const q = parseQuery(req, query);
  const where: Prisma.SupplierWhereInput = {
    salonId: ctx.salonId,
    ...(q.active === "true" ? { isActive: true } : q.active === "false" ? { isActive: false } : {}),
    ...(q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: "insensitive" } },
            { contactPerson: { contains: q.search, mode: "insensitive" } },
            { phone: { contains: q.search, mode: "insensitive" } },
            { email: { contains: q.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const take = q.export === "csv" ? 10000 : q.limit;
  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: {
        _count: { select: { purchaseOrders: true, goodsReceipts: true } },
      },
      orderBy: { name: "asc" },
      skip: q.export === "csv" ? 0 : (q.page - 1) * q.limit,
      take,
    }),
    prisma.supplier.count({ where }),
  ]);

  if (q.export === "csv") {
    return csvResponse("suppliers.csv", [
      ["Supplier Name", "Contact Person", "Phone", "Email", "Address", "Status"],
      ...suppliers.map((s) => [s.name, s.contactPerson || "", s.phone || "", s.email || "", s.address || "", s.isActive ? "Active" : "Inactive"]),
    ]);
  }

  return { suppliers, total, page: q.page, limit: q.limit };
});

export const POST = route({ permission: "supplier.manage", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, supplierSchema);
  const dup = await prisma.supplier.findFirst({
    where: { salonId: ctx.salonId, name: { equals: body.name, mode: "insensitive" } },
  });
  if (dup) throw new ApiError(409, "A supplier with this name already exists");

  const supplier = await prisma.$transaction(async (tx) => {
    const s = await tx.supplier.create({
      data: {
        salonId: ctx.salonId,
        ...body,
      },
    });
    await audit(tx, ctx, "SUPPLIER_CREATED", "Supplier", s.id, { newData: { name: s.name }, req });
    return s;
  });

  return Response.json({ supplier }, { status: 201 });
});
