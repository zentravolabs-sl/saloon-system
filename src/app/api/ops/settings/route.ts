import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { route, parseBody } from "@/lib/ops/api";
import { audit } from "@/lib/ops/audit";
import { getOpsSettings, parseOpsSettings } from "@/lib/ops/settings";

const schema = z.object({
  allowNegativeStock: z.boolean().optional(),
  consumeOn: z.enum(["COMPLETED", "IN_PROGRESS", "DISABLED"]).optional(),
  commissionEligibility: z.enum(["COMPLETED", "COMPLETED_AND_PAID"]).optional(),
  commissionOnNet: z.boolean().optional(),
  commissionAutoApprove: z.boolean().optional(),
  expenseAutoApproveOwner: z.boolean().optional(),
  overtimeDefaultEnabled: z.boolean().optional(),
});

export const GET = route({ permission: "ops.settings" }, async ({ ctx }) => {
  return { settings: await getOpsSettings(ctx.salonId) };
});

/** Owner-only business rules. Merged into Salon.settings.operations without touching other keys. */
export const PUT = route({ permission: "ops.settings", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, schema);
  const result = await prisma.$transaction(async (tx) => {
    const salon = await tx.salon.findUnique({ where: { id: ctx.salonId }, select: { settings: true } });
    const current =
      salon?.settings && typeof salon.settings === "object" && !Array.isArray(salon.settings)
        ? (salon.settings as Record<string, unknown>)
        : {};
    const before = parseOpsSettings(current);
    const after = { ...before, ...body };
    await tx.salon.update({
      where: { id: ctx.salonId },
      data: { settings: { ...current, operations: after } as Prisma.InputJsonValue },
    });
    await audit(tx, ctx, "OPS_SETTINGS_UPDATED", "Salon", ctx.salonId, { oldData: before, newData: after, req });
    return after;
  });
  return { settings: result };
});
