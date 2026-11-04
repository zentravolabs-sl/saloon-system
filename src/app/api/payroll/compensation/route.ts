import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError, assertStaffAccess } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";
import { money } from "@/lib/money";
import { compensationSchema } from "@/lib/ops/payroll-schemas";

export const GET = route({ permission: ["payroll.manage", "payroll.view"] }, async ({ ctx, req }) => {
  const staffId = new URL(req.url).searchParams.get("staffId");
  if (staffId) await assertStaffAccess(ctx, staffId);

  const list = await prisma.staffCompensation.findMany({
    where: {
      salonId: ctx.salonId,
      ...(staffId ? { staffId } : {}),
    },
    include: {
      staff: { select: { id: true, name: true, status: true, primaryBranch: { select: { id: true, name: true } } } },
    },
  });

  return { compensationList: list };
});

export const POST = route({ permission: "payroll.manage", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, compensationSchema);
  const staff = await assertStaffAccess(ctx, body.staffId);

  const comp = await prisma.$transaction(async (tx) => {
    const existing = await tx.staffCompensation.findUnique({ where: { staffId: staff.id } });

    const updated = await tx.staffCompensation.upsert({
      where: { staffId: staff.id },
      create: {
        salonId: ctx.salonId,
        staffId: staff.id,
        salaryType: body.salaryType,
        baseAmount: money(body.baseAmount),
        overtimeEnabled: body.overtimeEnabled,
        overtimeRate: money(body.overtimeRate),
        standardHoursPerDay: body.standardHoursPerDay,
        notes: body.notes,
        updatedById: ctx.userId,
      },
      update: {
        salaryType: body.salaryType,
        baseAmount: money(body.baseAmount),
        overtimeEnabled: body.overtimeEnabled,
        overtimeRate: money(body.overtimeRate),
        standardHoursPerDay: body.standardHoursPerDay,
        notes: body.notes,
        updatedById: ctx.userId,
      },
    });

    await audit(tx, ctx, "STAFF_COMPENSATION_CONFIGURED", "StaffCompensation", updated.id, {
      oldData: existing,
      newData: updated,
      req,
    });

    return updated;
  });

  return Response.json({ compensation: comp }, { status: 201 });
});
