import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError, assertBranchAccess } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";
import { rate4 } from "@/lib/money";
import { commissionRuleSchema } from "@/lib/ops/commission-schemas";
import { assertProductsInSalon, loadService } from "@/lib/ops/lookups";

export const GET = route({ permission: ["commission.manage", "commission.view"] }, async ({ ctx }) => {
  const rules = await prisma.commissionRule.findMany({
    where: { salonId: ctx.salonId },
    include: {
      branch: { select: { id: true, name: true } },
      staff: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, sku: true } },
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
  return { rules };
});

export const POST = route({ permission: "commission.manage", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, commissionRuleSchema);

  if (body.branchId) await assertBranchAccess(ctx, body.branchId);
  if (body.staffId) {
    const staff = await prisma.staff.findFirst({ where: { id: body.staffId, salonId: ctx.salonId } });
    if (!staff) throw new ApiError(404, "Staff not found");
  }
  if (body.source === "SERVICE" && body.serviceId) {
    await loadService(ctx, body.serviceId);
  }
  if (body.source === "PRODUCT" && body.productId) {
    await assertProductsInSalon(ctx, [body.productId]);
  }

  const rule = await prisma.$transaction(async (tx) => {
    const created = await tx.commissionRule.create({
      data: {
        salonId: ctx.salonId,
        branchId: body.branchId || null,
        staffId: body.staffId || null,
        source: body.source,
        serviceId: body.serviceId || null,
        productId: body.productId || null,
        type: body.type,
        value: rate4(body.value),
        isActive: body.isActive,
        createdById: ctx.userId,
      },
      include: {
        branch: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });

    await audit(tx, ctx, "COMMISSION_RULE_CREATED", "CommissionRule", created.id, {
      newData: { source: created.source, type: created.type, value: String(created.value) },
      req,
    });
    return created;
  });

  return Response.json({ rule }, { status: 201 });
});
