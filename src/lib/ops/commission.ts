import { Prisma } from "@/generated/prisma/client";
import { D, Decimal, money, rate4, round2 } from "@/lib/money";
import { getOpsSettings } from "@/lib/ops/settings";

export type Tx = Prisma.TransactionClient;

interface RuleMatch {
  ruleId: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: Decimal;
}

/**
 * Resolves the most specific commission rule:
 * Specificity rank:
 *   staffId match (+4)
 *   serviceId/productId match (+2)
 *   branchId match (+1)
 */
export async function findBestCommissionRule(
  tx: Tx,
  p: {
    salonId: string;
    branchId: string;
    staffId: string;
    source: "SERVICE" | "PRODUCT";
    serviceId?: string | null;
    productId?: string | null;
  }
): Promise<RuleMatch | null> {
  const rules = await tx.commissionRule.findMany({
    where: {
      salonId: p.salonId,
      source: p.source,
      isActive: true,
      OR: [{ staffId: p.staffId }, { staffId: null }],
      AND: [
        { OR: [{ branchId: p.branchId }, { branchId: null }] },
        p.source === "SERVICE"
          ? { OR: [{ serviceId: p.serviceId ?? undefined }, { serviceId: null }] }
          : { OR: [{ productId: p.productId ?? undefined }, { productId: null }] },
      ],
    },
  });

  if (rules.length === 0) return null;

  let bestRule: any = null;
  let bestScore = -1;

  for (const r of rules) {
    let score = 0;
    if (r.staffId === p.staffId) score += 4;
    if (p.source === "SERVICE" && r.serviceId === p.serviceId) score += 2;
    if (p.source === "PRODUCT" && r.productId === p.productId) score += 2;
    if (r.branchId === p.branchId) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestRule = r;
    }
  }

  if (!bestRule) return null;
  return {
    ruleId: bestRule.id,
    type: bestRule.type,
    value: D(bestRule.value),
  };
}

/**
 * Calculates and creates commission entries for an eligible completed appointment.
 * Idempotent: `sourceKey: "BOOKING_SERVICE:${serviceLine.id}"` prevents duplicates.
 * Historical snapshot: stores rateType, rateValue, baseAmount, and calculated amount.
 */
export async function evaluateBookingCommissions(
  tx: Tx,
  bookingId: string
) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: {
      services: { include: { service: true } },
    },
  });
  if (!booking) return [];

  const settings = await getOpsSettings(booking.salonId, tx);

  // Check eligibility rule
  const isEligibleStatus = booking.status === "COMPLETED";
  const isEligiblePayment =
    settings.commissionEligibility === "COMPLETED" ||
    (settings.commissionEligibility === "COMPLETED_AND_PAID" && booking.paymentStatus === "PAID");

  if (!isEligibleStatus || !isEligiblePayment) {
    return [];
  }

  const entries: any[] = [];
  const autoApprove = settings.commissionAutoApprove;

  for (const bs of booking.services) {
    const sourceKey = `BOOKING_SERVICE:${bs.id}`;
    // Check if already created
    const existing = await tx.commissionEntry.findUnique({ where: { sourceKey } });
    if (existing) continue;

    const staffId = bs.staffId || booking.staffId;
    if (!staffId) continue;

    const rule = await findBestCommissionRule(tx, {
      salonId: booking.salonId,
      branchId: booking.branchId,
      staffId,
      source: "SERVICE",
      serviceId: bs.serviceId,
    });

    if (!rule) continue;

    // Calculate base amount
    let baseAmount = D(bs.price);
    if (settings.commissionOnNet && D(booking.discountAmount).greaterThan(0) && D(booking.subtotal).greaterThan(0)) {
      // Proportionate discount reduction on line
      const discountRatio = D(booking.discountAmount).div(D(booking.subtotal));
      const lineDiscount = baseAmount.times(discountRatio);
      baseAmount = baseAmount.minus(lineDiscount);
    }
    if (baseAmount.lessThan(0)) baseAmount = D(0);

    let amount = D(0);
    if (rule.type === "PERCENTAGE") {
      amount = round2(baseAmount.times(rule.value).div(100));
    } else {
      amount = round2(rule.value);
    }

    if (amount.greaterThan(0)) {
      const entry = await tx.commissionEntry.create({
        data: {
          salonId: booking.salonId,
          branchId: booking.branchId,
          staffId,
          source: "SERVICE",
          sourceKey,
          bookingId: booking.id,
          bookingServiceId: bs.id,
          description: `Commission for ${bs.service.name} (${booking.reference})`,
          baseAmount: money(baseAmount),
          rateType: rule.type,
          rateValue: rate4(rule.value),
          amount: money(amount),
          status: autoApprove ? "APPROVED" : "PENDING",
          approvedAt: autoApprove ? new Date() : null,
          earnedAt: booking.bookingDate,
          ruleId: rule.ruleId,
        },
      });
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Handles voiding/reversing commissions if a booking is cancelled or refunded.
 */
export async function voidBookingCommissions(tx: Tx, bookingId: string, reason: string) {
  const entries = await tx.commissionEntry.findMany({
    where: { bookingId, status: { not: "VOIDED" } },
  });

  for (const entry of entries) {
    if (entry.status === "PAID") {
      // Create an offsetting negative adjustment entry so paid history is retained!
      const adjKey = `ADJUSTMENT:VOID:${entry.id}`;
      const existingAdj = await tx.commissionEntry.findUnique({ where: { sourceKey: adjKey } });
      if (!existingAdj) {
        await tx.commissionEntry.create({
          data: {
            salonId: entry.salonId,
            branchId: entry.branchId,
            staffId: entry.staffId,
            source: entry.source,
            sourceKey: adjKey,
            bookingId: entry.bookingId,
            description: `Offset reversal for voided booking (${reason})`,
            baseAmount: money(entry.baseAmount),
            rateType: entry.rateType,
            rateValue: entry.rateValue,
            amount: money(D(entry.amount).negated()),
            status: "APPROVED",
            earnedAt: new Date(),
            isAdjustment: true,
            adjustsEntryId: entry.id,
            notes: reason,
          },
        });
      }
    } else {
      await tx.commissionEntry.update({
        where: { id: entry.id },
        data: {
          status: "VOIDED",
          voidedAt: new Date(),
          voidReason: reason,
        },
      });
    }
  }
}
