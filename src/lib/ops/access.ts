import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkSalonApproval } from "@/lib/salon-status";

/**
 * Central permission model for Phase 1 modules, built on the existing roles
 * (SALON_OWNER, MANAGER, RECEPTIONIST, STAFF). SUPER_ADMIN has no salon context
 * and therefore cannot use salon-scoped operations endpoints.
 */
export type Permission =
  | "expense.view"
  | "expense.create"
  | "expense.edit"
  | "expense.approve"
  | "expense.delete"
  | "inventory.view"
  | "inventory.manage"
  | "supplier.manage"
  | "po.manage"
  | "pos.sell"
  | "pos.refund"
  | "commission.view"
  | "commission.view_own"
  | "commission.manage"
  | "payroll.view"
  | "payroll.manage"
  | "payroll.approve"
  | "payroll.pay"
  | "payroll.view_own"
  | "finance.view"
  | "ops.settings";

const OWNER: Permission[] = [
  "expense.view", "expense.create", "expense.edit", "expense.approve", "expense.delete",
  "inventory.view", "inventory.manage", "supplier.manage", "po.manage",
  "pos.sell", "pos.refund",
  "commission.view", "commission.view_own", "commission.manage",
  "payroll.view", "payroll.manage", "payroll.approve", "payroll.pay", "payroll.view_own",
  "finance.view", "ops.settings",
];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SALON_OWNER: OWNER,
  // Managers run day-to-day operations for their branches. Salary, payroll and the
  // salon-wide financial statements are owner-only (payroll.* / finance.view).
  MANAGER: [
    "expense.view", "expense.create", "expense.edit", "expense.approve",
    "inventory.view", "inventory.manage", "supplier.manage", "po.manage",
    "pos.sell", "pos.refund",
    "commission.view", "commission.view_own", "commission.manage",
    "payroll.view_own",
  ],
  // Receptionists sell and take payments only: no stock costs, no commissions/payroll views.
  RECEPTIONIST: ["pos.sell"],
  STAFF: ["pos.sell", "commission.view_own", "payroll.view_own"],
};

export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export interface AccessContext {
  userId: string;
  userName: string;
  role: string;
  salonId: string;
  /** Linked staff profile (if the logged-in user is also a staff member) */
  staffId: string | null;
  /** "ALL" = every branch of the salon, otherwise explicit branch IDs */
  branchScope: "ALL" | string[];
}

/**
 * Resolves the caller's identity ENTIRELY on the server from the session + DB.
 * Salon and branch IDs sent by the browser are never trusted; use
 * `assertBranchAccess` / `branchWhere` for anything the client supplies.
 */
export async function getAccessContext(): Promise<AccessContext> {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "Unauthorized");
  const role = session.user.role as string;
  const salonId = session.user.salonId;
  if (!salonId || role === "SUPER_ADMIN") {
    throw new ApiError(403, "A salon workspace is required for this operation");
  }

  // Re-read from DB so deactivated users / changed salons are honoured immediately
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      isActive: true,
      role: true,
      staffProfile: {
        select: {
          id: true,
          salonId: true,
          primaryBranchId: true,
          branches: { select: { branchId: true } },
        },
      },
      ownedSalons: { select: { id: true }, take: 1 },
    },
  });
  if (!user || !user.isActive) throw new ApiError(401, "Unauthorized");

  const ownsSalon = user.ownedSalons.some((s) => s.id === salonId);
  const staffInSalon = user.staffProfile && user.staffProfile.salonId === salonId;
  if (!ownsSalon && !staffInSalon) throw new ApiError(403, "Forbidden");

  const effectiveRole = user.role as string;
  let branchScope: "ALL" | string[];
  if (effectiveRole === "SALON_OWNER") {
    branchScope = "ALL";
  } else {
    const ids = new Set<string>();
    if (staffInSalon) {
      user.staffProfile!.branches.forEach((b) => ids.add(b.branchId));
      if (user.staffProfile!.primaryBranchId) ids.add(user.staffProfile!.primaryBranchId);
    }
    // Managers with no explicit branch assignment keep the existing salon-wide behaviour
    if (effectiveRole === "MANAGER" && ids.size === 0) branchScope = "ALL";
    else branchScope = Array.from(ids);
  }

  return {
    userId: user.id,
    userName: user.name,
    role: effectiveRole,
    salonId,
    staffId: staffInSalon ? user.staffProfile!.id : null,
    branchScope,
  };
}

export function requirePermission(ctx: AccessContext, permission: Permission | Permission[]) {
  const perms = Array.isArray(permission) ? permission : [permission];
  if (!perms.some((p) => can(ctx.role, p))) {
    throw new ApiError(403, "You do not have permission to perform this action");
  }
}

export async function requireApprovedSalon(ctx: AccessContext) {
  const check = await checkSalonApproval(ctx.salonId, ctx.role);
  if (!check.approved) throw new ApiError(403, check.error || "Salon is not approved");
}

/** IDs of every branch of the salon the caller may access */
export async function allowedBranchIds(ctx: AccessContext): Promise<string[]> {
  const branches = await prisma.branch.findMany({
    where: {
      salonId: ctx.salonId,
      ...(ctx.branchScope === "ALL" ? {} : { id: { in: ctx.branchScope } }),
    },
    select: { id: true },
  });
  return branches.map((b) => b.id);
}

/** Verifies a client-supplied branch belongs to the caller's salon AND is within their scope */
export async function assertBranchAccess(ctx: AccessContext, branchId: string | null | undefined) {
  if (!branchId) throw new ApiError(400, "branchId is required");
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, salonId: ctx.salonId },
    select: { id: true },
  });
  if (!branch) throw new ApiError(404, "Branch not found");
  if (ctx.branchScope !== "ALL" && !ctx.branchScope.includes(branchId)) {
    throw new ApiError(403, "You do not have access to this branch");
  }
  return branchId;
}

/**
 * Builds the `branchId` portion of a Prisma `where` from an optional client filter,
 * always constrained to the caller's permitted branches.
 */
export async function branchWhere(
  ctx: AccessContext,
  requested?: string | null
): Promise<{ branchId: string | { in: string[] } }> {
  if (requested) {
    await assertBranchAccess(ctx, requested);
    return { branchId: requested };
  }
  const ids = await allowedBranchIds(ctx);
  return { branchId: { in: ids } };
}

/** Throws unless a staff member exists in the caller's salon and (optionally) a permitted branch */
export async function assertStaffAccess(ctx: AccessContext, staffId: string) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, salonId: ctx.salonId },
    select: {
      id: true,
      name: true,
      primaryBranchId: true,
      branches: { select: { branchId: true } },
    },
  });
  if (!staff) throw new ApiError(404, "Staff member not found");
  if (ctx.branchScope !== "ALL") {
    const branchIds = new Set(staff.branches.map((b) => b.branchId));
    if (staff.primaryBranchId) branchIds.add(staff.primaryBranchId);
    const scope = ctx.branchScope;
    if (!Array.from(branchIds).some((b) => scope.includes(b)) && staff.id !== ctx.staffId) {
      throw new ApiError(403, "You do not have access to this staff member");
    }
  }
  return staff;
}

/**
 * Scope information for the classic (non-oute()) API handlers, derived server-side.
 * - ranchIds: null means "every branch of the salon"; otherwise the caller is limited to
 *   these branches. Owners, super admins and users with no explicit branch assignment keep
 *   salon-wide access (the pre-existing behaviour).
 * - staffId: for the STAFF role, the only staff record they may read or act on.
 */
export interface LegacyScope {
  role: string;
  salonId: string | null;
  branchIds: string[] | null;
  staffId: string | null;
}

export async function getLegacyScope(): Promise<LegacyScope | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = session.user.role as string;
  const salonId = session.user.salonId ?? null;
  if (role === "SUPER_ADMIN" || !salonId) {
    return { role, salonId, branchIds: null, staffId: null };
  }
  const ctx = await getAccessContext();
  const branchIds =
    ctx.branchScope === "ALL" || ctx.branchScope.length === 0 ? null : ctx.branchScope;
  return {
    role: ctx.role,
    salonId,
    branchIds: role === "SALON_OWNER" ? null : branchIds,
    staffId: ctx.role === "STAFF" ? ctx.staffId : null,
  };
}
