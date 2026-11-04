import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, parseBody, parseQuery, csvResponse } from "@/lib/ops/api";
import { assertBranchAccess, assertStaffAccess } from "@/lib/ops/access";
import { audit } from "@/lib/ops/audit";
import { money } from "@/lib/money";
import { advanceSchema } from "@/lib/ops/payroll-schemas";
import { parseDay } from "@/lib/ops/periods";
import { pageQuery } from "@/lib/ops/schemas";

const query = pageQuery.extend({
  staffId: z.string().optional(),
  status: z.enum(["OUTSTANDING", "RECOVERED", "VOIDED"]).optional(),
  export: z.enum(["csv"]).optional(),
});

export const GET = route({ permission: ["payroll.manage", "payroll.view"] }, async ({ ctx, req }) => {
  const q = parseQuery(req, query);
  if (q.staffId) await assertStaffAccess(ctx, q.staffId);

  const where = {
    salonId: ctx.salonId,
    ...(q.staffId ? { staffId: q.staffId } : {}),
    ...(q.status ? { status: q.status } : {}),
  };

  const take = q.export === "csv" ? 10000 : q.limit;
  const [advances, total] = await Promise.all([
    prisma.staffAdvance.findMany({
      where,
      include: {
        staff: { select: { id: true, name: true } },
        recoveries: { select: { id: true, amount: true, applied: true, payrollRecordId: true } },
      },
      orderBy: { advanceDate: "desc" },
      skip: q.export === "csv" ? 0 : (q.page - 1) * q.limit,
      take,
    }),
    prisma.staffAdvance.count({ where }),
  ]);

  if (q.export === "csv") {
    return csvResponse("salary-advances.csv", [
      ["Date", "Staff", "Amount", "Installment Cap", "Recovered", "Status", "Reason"],
      ...advances.map((a) => [
        a.advanceDate.toISOString().slice(0, 10),
        a.staff.name,
        money(a.amount),
        a.installmentAmount ? money(a.installmentAmount) : "-",
        money(a.recoveredAmount),
        a.status,
        a.reason || "",
      ]),
    ]);
  }

  return { advances, total, page: q.page, limit: q.limit };
});

export const POST = route({ permission: "payroll.manage", write: true }, async ({ ctx, req }) => {
  const body = await parseBody(req, advanceSchema);
  const staff = await assertStaffAccess(ctx, body.staffId);
  if (body.branchId) await assertBranchAccess(ctx, body.branchId);

  const advance = await prisma.$transaction(async (tx) => {
    const created = await tx.staffAdvance.create({
      data: {
        salonId: ctx.salonId,
        staffId: staff.id,
        branchId: body.branchId || staff.primaryBranchId || null,
        amount: money(body.amount),
        advanceDate: parseDay(body.advanceDate),
        reason: body.reason,
        installmentAmount: body.installmentAmount ? money(body.installmentAmount) : null,
        createdById: ctx.userId,
      },
      include: { staff: true },
    });

    await audit(tx, ctx, "SALARY_ADVANCE_RECORDED", "StaffAdvance", created.id, {
      newData: { staff: staff.name, amount: money(body.amount), date: body.advanceDate },
      req,
    });
    return created;
  });

  return Response.json({ advance }, { status: 201 });
});
