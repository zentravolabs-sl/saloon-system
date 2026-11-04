import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";
import { rate4 } from "@/lib/money";
import { commissionRuleUpdateSchema } from "@/lib/ops/commission-schemas";

type P = { id: string };

export const PATCH = route<P>({ permission: "commission.manage", write: true }, async ({ ctx, req, params }) => {
  const existing = await prisma.commissionRule.findFirst({
    where: { id: params.id, salonId: ctx.salonId },
  });
  if (!existing) throw new ApiError(404, "Commission rule not found");

  const body = await parseBody(req, commissionRuleUpdateSchema);

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.commissionRule.update({
      where: { id: existing.id },
      data: {
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.value !== undefined ? { value: rate4(body.value) } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    await audit(tx, ctx, "COMMISSION_RULE_UPDATED", "CommissionRule", existing.id, {
      oldData: { value: String(existing.value), isActive: existing.isActive },
      newData: { value: String(res.value), isActive: res.isActive },
      req,
    });
    return res;
  });

  return { rule: updated };
});

export const DELETE = route<P>({ permission: "commission.manage", write: true }, async ({ ctx, req, params }) => {
  const existing = await prisma.commissionRule.findFirst({
    where: { id: params.id, salonId: ctx.salonId },
  });
  if (!existing) throw new ApiError(404, "Commission rule not found");

  await prisma.$transaction(async (tx) => {
    await tx.commissionRule.delete({ where: { id: existing.id } });
    await audit(tx, ctx, "COMMISSION_RULE_DELETED", "CommissionRule", existing.id, { req });
  });

  return { ok: true };
});
