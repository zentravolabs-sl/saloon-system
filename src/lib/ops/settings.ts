import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * Configurable business rules, stored under `Salon.settings.operations` (existing JSON
 * settings column - no schema change).
 */
export interface OpsSettings {
  /** Allow sales / consumption to push stock below zero */
  allowNegativeStock: boolean;
  /** When service product consumption is deducted from inventory */
  consumeOn: "COMPLETED" | "IN_PROGRESS" | "DISABLED";
  /** What an appointment needs before it earns commission */
  commissionEligibility: "COMPLETED" | "COMPLETED_AND_PAID";
  /** Compute service commission on the price net of discount (true) or gross price (false) */
  commissionOnNet: boolean;
  /** Commissions are approved automatically at creation instead of PENDING */
  commissionAutoApprove: boolean;
  /** Expenses start APPROVED when created by someone allowed to approve */
  expenseAutoApproveOwner: boolean;
  /** Default payroll overtime switch for newly configured employees */
  overtimeDefaultEnabled: boolean;
}

export const DEFAULT_OPS_SETTINGS: OpsSettings = {
  allowNegativeStock: false,
  consumeOn: "COMPLETED",
  commissionEligibility: "COMPLETED_AND_PAID",
  commissionOnNet: true,
  commissionAutoApprove: false,
  expenseAutoApproveOwner: true,
  overtimeDefaultEnabled: false,
};

export function parseOpsSettings(settings: unknown): OpsSettings {
  const ops =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? ((settings as Record<string, unknown>).operations as Partial<OpsSettings> | undefined)
      : undefined;
  return { ...DEFAULT_OPS_SETTINGS, ...(ops || {}) };
}

type Client = Prisma.TransactionClient | typeof prisma;

export async function getOpsSettings(salonId: string, client: Client = prisma): Promise<OpsSettings> {
  const salon = await client.salon.findUnique({
    where: { id: salonId },
    select: { settings: true },
  });
  return parseOpsSettings(salon?.settings);
}

export async function getSalonCurrency(salonId: string): Promise<string> {
  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { currency: true } });
  return salon?.currency || "LKR";
}
