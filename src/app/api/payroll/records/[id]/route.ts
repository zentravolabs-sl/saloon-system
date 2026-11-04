import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, parseBody } from "@/lib/ops/api";
import { ApiError, assertBranchAccess, can } from "@/lib/ops/access";
import { audit, userNames } from "@/lib/ops/audit";
import { D, money } from "@/lib/money";
import { recordPaymentSchema } from "@/lib/ops/payroll-schemas";

type P = { id: string };

async function loadRecord(ctx: any, id: string) {
  const record = await prisma.payrollRecord.findFirst({
    where: { id, salonId: ctx.salonId },
    include: {
      branch: true,
      staff: true,
      adjustments: true,
      advanceRecoveries: { include: { advance: true } },
      commissions: true,
    },
  });
  if (!record) throw new ApiError(404, "Payroll record not found");

  if (!can(ctx.role, "payroll.view")) {
    if (record.staffId !== ctx.staffId) throw new ApiError(403, "Forbidden");
  } else {
    await assertBranchAccess(ctx, record.branchId);
  }

  return record;
}

export const GET = route<P>({ permission: ["payroll.view", "payroll.view_own"] }, async ({ ctx, params }) => {
  const record = await loadRecord(ctx, params.id);
  const names = await userNames([record.generatedById, record.approvedById, record.paidById, record.voidedById]);
  const salon = await prisma.salon.findUnique({
    where: { id: ctx.salonId },
    select: { name: true, logo: true, phone: true, email: true, address: true, currency: true },
  });

  return {
    record: {
      ...record,
      generatedByName: names[record.generatedById] || null,
      approvedByName: record.approvedById ? names[record.approvedById] || null : null,
      paidByName: record.paidById ? names[record.paidById] || null : null,
      voidedByName: record.voidedById ? names[record.voidedById] || null : null,
    },
    salon,
  };
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("void"), reason: z.string().trim().min(2, "Void reason required") }),
  z.object({
    action: z.literal("pay"),
    paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "OTHER"]).default("BANK_TRANSFER"),
    paymentReference: z.string().trim().max(100).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  }),
]);

export const POST = route<P>({ permission: ["payroll.approve", "payroll.pay", "payroll.manage"], write: true }, async ({ ctx, req, params }) => {
  const record = await loadRecord(ctx, params.id);
  const body = await parseBody(req, actionSchema);

  if (body.action === "approve") {
    if (!can(ctx.role, "payroll.approve")) throw new ApiError(403, "Permission denied to approve payroll");
    if (record.status !== "DRAFT") throw new ApiError(409, "Only draft payroll records can be approved");

    const updated = await prisma.payrollRecord.update({
      where: { id: record.id },
      data: { status: "APPROVED", approvedById: ctx.userId, approvedAt: new Date() },
    });
    await audit(prisma, ctx, "PAYROLL_APPROVED", "PayrollRecord", record.id, { req });
    return { record: updated };
  }

  if (body.action === "pay") {
    if (!can(ctx.role, "payroll.pay")) throw new ApiError(403, "Permission denied to record payroll payment");
    if (record.status === "PAID") throw new ApiError(409, "Payroll record is already marked as paid");
    if (record.status === "VOIDED") throw new ApiError(409, "Cannot pay a voided payroll record");

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark payroll record as paid
      const pRecord = await tx.payrollRecord.update({
        where: { id: record.id },
        data: {
          status: "PAID",
          paidById: ctx.userId,
          paidAt: new Date(),
          paymentMethod: body.paymentMethod,
          paymentReference: body.paymentReference || null,
          notes: body.notes || record.notes,
        },
      });

      // 2. Mark advance recoveries as applied & increment recoveredAmount on StaffAdvance
      for (const rec of record.advanceRecoveries) {
        if (!rec.applied) {
          await tx.payrollAdvanceRecovery.update({
            where: { id: rec.id },
            data: { applied: true },
          });

          const adv = await tx.staffAdvance.findUnique({ where: { id: rec.advanceId } });
          if (adv) {
            const newRecovered = D(adv.recoveredAmount).plus(D(rec.amount));
            const isFull = newRecovered.greaterThanOrEqualTo(D(adv.amount));
            await tx.staffAdvance.update({
              where: { id: adv.id },
              data: {
                recoveredAmount: money(newRecovered),
                status: isFull ? "RECOVERED" : "OUTSTANDING",
              },
            });
          }
        }
      }

      // 3. Mark linked commission entries as PAID
      if (record.commissions.length > 0) {
        await tx.commissionEntry.updateMany({
          where: { payrollRecordId: record.id },
          data: { status: "PAID", paidAt: new Date() },
        });
      }

      await audit(tx, ctx, "PAYROLL_PAID", "PayrollRecord", record.id, {
        newData: { amount: record.netAmount, method: body.paymentMethod },
        req,
      });

      return pRecord;
    });

    return { record: updated };
  }

  if (body.action === "void") {
    if (!can(ctx.role, "payroll.manage")) throw new ApiError(403, "Permission denied to void payroll");
    if (record.status === "PAID") {
      throw new ApiError(409, "Paid payroll records cannot be voided directly");
    }
    if (record.status === "VOIDED") throw new ApiError(409, "Payroll record is already voided");

    const updated = await prisma.$transaction(async (tx) => {
      // Release any linked commission entries so they can be included in future payroll runs
      await tx.commissionEntry.updateMany({
        where: { payrollRecordId: record.id },
        data: { payrollRecordId: null },
      });

      const res = await tx.payrollRecord.update({
        where: { id: record.id },
        data: {
          status: "VOIDED",
          voidedById: ctx.userId,
          voidedAt: new Date(),
          voidReason: body.reason,
        },
      });

      await audit(tx, ctx, "PAYROLL_VOIDED", "PayrollRecord", record.id, {
        metadata: { reason: body.reason },
        req,
      });

      return res;
    });

    return { record: updated };
  }

  throw new ApiError(400, "Invalid action");
});
