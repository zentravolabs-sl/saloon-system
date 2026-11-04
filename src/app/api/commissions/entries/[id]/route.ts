import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";

type P = { id: string };

const actionSchema = z.object({
  action: z.enum(["approve", "void"]),
  reason: z.string().trim().max(300).optional(),
});

export const POST = route<P>({ permission: "commission.manage", write: true }, async ({ ctx, req, params }) => {
  const entry = await prisma.commissionEntry.findFirst({
    where: { id: params.id, salonId: ctx.salonId },
  });
  if (!entry) throw new ApiError(404, "Commission entry not found");

  const { action, reason } = await parseBody(req, actionSchema);

  if (action === "approve") {
    if (entry.status !== "PENDING") throw new ApiError(409, "Only pending commission entries can be approved");
    const updated = await prisma.commissionEntry.update({
      where: { id: entry.id },
      data: { status: "APPROVED", approvedAt: new Date(), approvedById: ctx.userId },
    });
    await audit(prisma, ctx, "COMMISSION_APPROVED", "CommissionEntry", entry.id, { req });
    return { entry: updated };
  }

  if (action === "void") {
    if (entry.status === "PAID") throw new ApiError(409, "Paid commissions cannot be voided directly; create an adjustment");
    if (entry.status === "VOIDED") throw new ApiError(409, "Commission is already voided");
    const updated = await prisma.commissionEntry.update({
      where: { id: entry.id },
      data: { status: "VOIDED", voidedAt: new Date(), voidReason: reason || "Voided by admin" },
    });
    await audit(prisma, ctx, "COMMISSION_VOIDED", "CommissionEntry", entry.id, { req });
    return { entry: updated };
  }

  throw new ApiError(400, "Invalid action");
});
