import { prisma } from "@/lib/prisma";
import { route } from "@/lib/ops/api";
import { ROLE_PERMISSIONS, allowedBranchIds } from "@/lib/ops/access";
import { getOpsSettings } from "@/lib/ops/settings";

/** Bootstrap data for every operations screen: caller's permissions, branches, currency, rules */
export const GET = route(
  {
    permission: [
      "expense.view", "inventory.view", "pos.sell", "commission.view", "commission.view_own",
      "payroll.view", "payroll.view_own", "finance.view",
    ],
  },
  async ({ ctx }) => {
    const ids = await allowedBranchIds(ctx);
    const [branches, salon, settings] = await Promise.all([
      prisma.branch.findMany({
        where: { id: { in: ids }, status: { not: "CLOSED" } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.salon.findUnique({ where: { id: ctx.salonId }, select: { name: true, currency: true } }),
      getOpsSettings(ctx.salonId),
    ]);
    return {
      user: { id: ctx.userId, name: ctx.userName, role: ctx.role, staffId: ctx.staffId },
      permissions: ROLE_PERMISSIONS[ctx.role] || [],
      allBranches: ctx.branchScope === "ALL",
      branches,
      salon,
      currency: salon?.currency || "LKR",
      settings,
    };
  }
);
