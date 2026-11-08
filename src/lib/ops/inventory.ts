import { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/ops/access";
import { D, Decimal, max, min, money, qty, rate4, round4 } from "@/lib/money";

export type Tx = Prisma.TransactionClient;

/**
 * ============================================================================
 * Stock engine - the ONLY place StockLevel / StockBatch quantities change.
 *
 * Guarantees:
 *  - every quantity change writes a StockMovement (with balanceAfter)
 *  - callers pass a transaction client so stock, documents, audit and payments commit atomically
 *  - the StockLevel row is locked (SELECT ... FOR UPDATE) before reading/changing it, so concurrent
 *    sales/transfers/consumption on the same product+branch serialise and cannot oversell
 *  - multi-product operations lock rows in a deterministic order (productId) to avoid deadlocks
 *  - weighted-average cost is maintained for COGS and valuation
 * ============================================================================
 */

export class InsufficientStockError extends ApiError {
  constructor(public productName: string, public available: Decimal, public requested: Decimal) {
    super(
      409,
      `Insufficient stock for "${productName}": ${available.toFixed(3).replace(/\.?0+$/, "")} available, ${requested
        .toFixed(3)
        .replace(/\.?0+$/, "")} requested`
    );
  }
}

interface LockedLevel {
  id: string;
  quantity: Decimal;
  avgCost: Decimal;
}

async function lockLevel(tx: Tx, salonId: string, productId: string, branchId: string): Promise<LockedLevel> {
  await tx.stockLevel.upsert({
    where: { productId_branchId: { productId, branchId } },
    create: { salonId, productId, branchId },
    update: {},
  });
  const rows = await tx.$queryRaw<{ id: string; quantity: unknown; avgCost: unknown }[]>`
    SELECT "id", "quantity", "avgCost" FROM "StockLevel"
    WHERE "productId" = ${productId} AND "branchId" = ${branchId}
    FOR UPDATE`;
  const row = rows[0];
  if (!row) throw new ApiError(500, "Stock level could not be locked");
  return { id: row.id, quantity: D(String(row.quantity)), avgCost: D(String(row.avgCost)) };
}

export interface BatchInfo {
  batchNumber?: string | null;
  expiryDate?: Date | null;
}

export interface StockInInput {
  salonId: string;
  branchId: string;
  productId: string;
  quantity: Decimal; // positive
  unitCost: Decimal;
  type: "PURCHASE_RECEIPT" | "MANUAL_IN" | "ADJUSTMENT" | "TRANSFER_IN" | "SALE_RETURN" | "CONSUMPTION_REVERSAL";
  referenceType?: string;
  referenceId?: string;
  reason?: string | null;
  userId?: string | null;
  batch?: BatchInfo | null;
  /** Keep the existing average cost (adjustments / returns at known cost still blend in) */
  skipAverage?: boolean;
}

export async function stockIn(tx: Tx, input: StockInInput) {
  const inQty = D(input.quantity);
  const inCost = D(input.unitCost);
  if (!inQty.greaterThan(0)) throw new ApiError(400, "Quantity must be greater than zero");
  const level = await lockLevel(tx, input.salonId, input.productId, input.branchId);

  const onHandPositive = max(level.quantity, D(0));
  const newQty = level.quantity.plus(inQty);
  let newAvg = level.avgCost;
  if (!input.skipAverage) {
    const totalQty = onHandPositive.plus(inQty);
    newAvg = totalQty.isZero()
      ? inCost
      : onHandPositive.times(level.avgCost).plus(inQty.times(inCost)).div(totalQty);
  }

  await tx.stockLevel.update({
    where: { id: level.id },
    data: { quantity: qty(newQty), avgCost: rate4(newAvg) },
  });

  let batchId: string | null = null;
  const hasBatch = input.batch && (input.batch.batchNumber || input.batch.expiryDate);
  if (hasBatch) {
    const existing = await tx.stockBatch.findFirst({
      where: {
        productId: input.productId,
        branchId: input.branchId,
        batchNumber: input.batch!.batchNumber ?? null,
        expiryDate: input.batch!.expiryDate ?? null,
      },
    });
    if (existing) {
      await tx.stockBatch.update({ where: { id: existing.id }, data: { quantity: { increment: qty(input.quantity) } } });
      batchId = existing.id;
    } else {
      const created = await tx.stockBatch.create({
        data: {
          salonId: input.salonId,
          productId: input.productId,
          branchId: input.branchId,
          batchNumber: input.batch!.batchNumber ?? null,
          expiryDate: input.batch!.expiryDate ?? null,
          quantity: qty(input.quantity),
          unitCost: rate4(input.unitCost),
        },
      });
      batchId = created.id;
    }
  }

  const movement = await tx.stockMovement.create({
    data: {
      salonId: input.salonId,
      branchId: input.branchId,
      productId: input.productId,
      batchId,
      type: input.type,
      quantity: qty(input.quantity),
      balanceAfter: qty(newQty),
      unitCost: rate4(input.unitCost),
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      reason: input.reason ?? null,
      createdById: input.userId ?? null,
    },
  });
  return { movementId: movement.id, balanceAfter: newQty, avgCost: newAvg };
}

export interface StockOutContext {
  salonId: string;
  branchId: string;
  type: "MANUAL_OUT" | "ADJUSTMENT" | "TRANSFER_OUT" | "SALE" | "SERVICE_CONSUMPTION";
  referenceType?: string;
  referenceId?: string;
  reason?: string | null;
  userId?: string | null;
  /** Configurable business rule: permit negative stock instead of rejecting */
  allowNegative?: boolean;
}

export interface StockSlice {
  batchId: string | null;
  batchNumber: string | null;
  expiryDate: Date | null;
  quantity: Decimal;
}

export interface StockOutResult {
  productId: string;
  quantity: Decimal;
  /** Weighted-average unit cost at the time of issue (the COGS cost) */
  unitCost: Decimal;
  slices: StockSlice[];
}

/**
 * Issues stock for many products atomically. Either every line is issued or (on insufficient stock)
 * an InsufficientStockError is thrown BEFORE any quantity is changed.
 */
export async function stockOutMany(
  tx: Tx,
  ctx: StockOutContext,
  lines: { productId: string; quantity: Decimal }[]
): Promise<Map<string, StockOutResult>> {
  // Merge duplicates and lock in deterministic order
  const merged = new Map<string, Decimal>();
  for (const l of lines) {
    if (!l.quantity.greaterThan(0)) throw new ApiError(400, "Quantity must be greater than zero");
    merged.set(l.productId, (merged.get(l.productId) || D(0)).plus(l.quantity));
  }
  const ordered = Array.from(merged.entries()).sort(([a], [b]) => a.localeCompare(b));

  const locked = new Map<string, LockedLevel>();
  for (const [productId] of ordered) {
    locked.set(productId, await lockLevel(tx, ctx.salonId, productId, ctx.branchId));
  }

  // Verify everything first (nothing has been modified yet)
  if (!ctx.allowNegative) {
    for (const [productId, need] of ordered) {
      const level = locked.get(productId)!;
      if (level.quantity.lessThan(need)) {
        const product = await tx.product.findUnique({ where: { id: productId }, select: { name: true } });
        throw new InsufficientStockError(product?.name || productId, level.quantity, need);
      }
    }
  }

  const results = new Map<string, StockOutResult>();
  for (const [productId, need] of ordered) {
    const level = locked.get(productId)!;
    const newQty = level.quantity.minus(need);
    await tx.stockLevel.update({ where: { id: level.id }, data: { quantity: qty(newQty) } });

    // First-expiry-first-out across batches; the remainder comes from un-batched stock
    const batches = await tx.stockBatch.findMany({
      where: { productId, branchId: ctx.branchId, quantity: { gt: 0 } },
      orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }, { receivedAt: "asc" }],
    });

    let remaining = need;
    let running = level.quantity;
    const slices: StockSlice[] = [];
    for (const batch of batches) {
      if (remaining.lessThanOrEqualTo(0)) break;
      const take = min(D(batch.quantity), remaining);
      await tx.stockBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: qty(take) } } });
      running = running.minus(take);
      await tx.stockMovement.create({
        data: {
          salonId: ctx.salonId,
          branchId: ctx.branchId,
          productId,
          batchId: batch.id,
          type: ctx.type,
          quantity: qty(take.negated()),
          balanceAfter: qty(running),
          unitCost: rate4(level.avgCost),
          referenceType: ctx.referenceType,
          referenceId: ctx.referenceId,
          reason: ctx.reason ?? null,
          createdById: ctx.userId ?? null,
        },
      });
      slices.push({ batchId: batch.id, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate, quantity: take });
      remaining = remaining.minus(take);
    }
    if (remaining.greaterThan(0)) {
      running = running.minus(remaining);
      await tx.stockMovement.create({
        data: {
          salonId: ctx.salonId,
          branchId: ctx.branchId,
          productId,
          type: ctx.type,
          quantity: qty(remaining.negated()),
          balanceAfter: qty(running),
          unitCost: rate4(level.avgCost),
          referenceType: ctx.referenceType,
          referenceId: ctx.referenceId,
          reason: ctx.reason ?? null,
          createdById: ctx.userId ?? null,
        },
      });
      slices.push({ batchId: null, batchNumber: null, expiryDate: null, quantity: remaining });
    }
    results.set(productId, { productId, quantity: need, unitCost: round4(level.avgCost), slices });
  }
  return results;
}

/** Sets stock to a counted quantity, recording the difference as an ADJUSTMENT movement */
export async function adjustStockTo(
  tx: Tx,
  p: {
    salonId: string;
    branchId: string;
    productId: string;
    newQuantity: Decimal;
    reason: string;
    userId: string;
    fallbackCost: Decimal;
  }
) {
  const level = await lockLevel(tx, p.salonId, p.productId, p.branchId);
  const delta = p.newQuantity.minus(level.quantity);
  if (delta.isZero()) return { delta, changed: false };
  if (delta.greaterThan(0)) {
    await stockIn(tx, {
      salonId: p.salonId,
      branchId: p.branchId,
      productId: p.productId,
      quantity: delta,
      unitCost: level.avgCost.greaterThan(0) ? level.avgCost : p.fallbackCost,
      type: "ADJUSTMENT",
      referenceType: "MANUAL",
      reason: p.reason,
      userId: p.userId,
      skipAverage: true,
    });
  } else {
    await stockOutMany(
      tx,
      {
        salonId: p.salonId,
        branchId: p.branchId,
        type: "ADJUSTMENT",
        referenceType: "MANUAL",
        reason: p.reason,
        userId: p.userId,
        allowNegative: true,
      },
      [{ productId: p.productId, quantity: delta.abs() }]
    );
  }
  return { delta, changed: true };
}

/** Moves stock between branches in one transaction (out at source, in at destination) */
export async function transferStock(
  tx: Tx,
  p: {
    salonId: string;
    fromBranchId: string;
    toBranchId: string;
    transferId: string;
    userId: string;
    reason?: string | null;
    lines: { productId: string; quantity: Decimal }[];
  }
) {
  if (p.fromBranchId === p.toBranchId) throw new ApiError(400, "Source and destination branch must differ");
  const out = await stockOutMany(
    tx,
    {
      salonId: p.salonId,
      branchId: p.fromBranchId,
      type: "TRANSFER_OUT",
      referenceType: "TRANSFER",
      referenceId: p.transferId,
      reason: p.reason,
      userId: p.userId,
      allowNegative: false, // never transfer stock that does not exist
    },
    p.lines
  );
  for (const result of out.values()) {
    for (const slice of result.slices) {
      await stockIn(tx, {
        salonId: p.salonId,
        branchId: p.toBranchId,
        productId: result.productId,
        quantity: slice.quantity,
        unitCost: result.unitCost,
        type: "TRANSFER_IN",
        referenceType: "TRANSFER",
        referenceId: p.transferId,
        reason: p.reason,
        userId: p.userId,
        batch: slice.batchId ? { batchNumber: slice.batchNumber, expiryDate: slice.expiryDate } : null,
      });
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// Service product consumption (recipes)
// ----------------------------------------------------------------------------

export type ConsumptionOutcome =
  | { status: "NO_RECIPE" }
  | { status: "ALREADY_APPLIED" }
  | { status: "SKIPPED"; reason: string }
  | { status: "APPLIED"; totalCost: Decimal }
  | { status: "FAILED"; message: string };

/**
 * Deducts the configured product quantities for a booking's services from its branch inventory.
 * Idempotent: BookingConsumption.bookingId is unique and an APPLIED row blocks re-deduction.
 * A shortage never blocks the appointment: it is recorded as FAILED (retry once restocked).
 */
export async function applyBookingConsumption(
  tx: Tx,
  bookingId: string,
  opts: { allowNegative: boolean; userId?: string | null; force?: boolean }
): Promise<ConsumptionOutcome> {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, salonId: true, branchId: true, reference: true, services: { select: { serviceId: true } } },
  });
  if (!booking) throw new ApiError(404, "Booking not found");

  const existing = await tx.bookingConsumption.findUnique({ where: { bookingId } });
  if (existing?.status === "APPLIED") return { status: "ALREADY_APPLIED" };
  if (existing?.status === "REVERSED" && !opts.force) {
    return { status: "SKIPPED", reason: "Consumption was reversed for this booking" };
  }

  const serviceIds = Array.from(new Set(booking.services.map((s) => s.serviceId)));
  const usages = await tx.serviceProduct.findMany({
    where: { serviceId: { in: serviceIds }, product: { salonId: booking.salonId } },
    select: { serviceId: true, productId: true, quantity: true },
  });
  if (usages.length === 0) return { status: "NO_RECIPE" };

  // One recipe application per booked service line
  const required = new Map<string, Decimal>();
  for (const line of booking.services) {
    for (const u of usages.filter((x) => x.serviceId === line.serviceId)) {
      required.set(u.productId, (required.get(u.productId) || D(0)).plus(D(u.quantity)));
    }
  }

  // Resolve the effective branch for consumption: use booking.branchId if it has stock,
  // otherwise fall back to the salon's primary branch that holds stock for these products
  let targetBranchId = booking.branchId;
  const requiredProductIds = Array.from(required.keys());
  const bookingBranchLevels = await tx.stockLevel.findMany({
    where: { branchId: booking.branchId, productId: { in: requiredProductIds } },
    select: { productId: true, quantity: true },
  });
  const hasEnoughInBookingBranch = requiredProductIds.every((pid) => {
    const lvl = bookingBranchLevels.find((l) => l.productId === pid);
    return lvl && D(lvl.quantity).greaterThanOrEqualTo(required.get(pid)!);
  });
  if (!hasEnoughInBookingBranch) {
    const salonLevels = await tx.stockLevel.findMany({
      where: { salonId: booking.salonId, productId: { in: requiredProductIds }, quantity: { gt: 0 } },
      orderBy: { quantity: "desc" },
      select: { branchId: true, productId: true, quantity: true },
    });
    if (salonLevels.length > 0) {
      targetBranchId = salonLevels[0].branchId;
    }
  }

  let result: Map<string, StockOutResult>;
  try {
    result = await stockOutMany(
      tx,
      {
        salonId: booking.salonId,
        branchId: targetBranchId,
        type: "SERVICE_CONSUMPTION",
        referenceType: "BOOKING",
        referenceId: booking.id,
        reason: "Used in salon",
        userId: opts.userId,
        allowNegative: opts.allowNegative,
      },
      Array.from(required.entries()).map(([productId, quantity]) => ({ productId, quantity }))
    );
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      await tx.bookingConsumption.upsert({
        where: { bookingId },
        create: { bookingId, salonId: booking.salonId, branchId: targetBranchId, status: "FAILED", message: e.message },
        update: { status: "FAILED", message: e.message },
      });
      return { status: "FAILED", message: e.message };
    }
    throw e;
  }

  const items = Array.from(result.values()).map((r) => ({
    productId: r.productId,
    quantity: qty(r.quantity),
    unitCost: rate4(r.unitCost),
    totalCost: money(r.quantity.times(r.unitCost)),
  }));
  const consumption = await tx.bookingConsumption.upsert({
    where: { bookingId },
    create: { bookingId, salonId: booking.salonId, branchId: targetBranchId, status: "APPLIED", appliedAt: new Date() },
    update: { branchId: targetBranchId, status: "APPLIED", message: null, appliedAt: new Date(), reversedAt: null },
  });
  await tx.bookingConsumptionItem.deleteMany({ where: { consumptionId: consumption.id } });
  await tx.bookingConsumptionItem.createMany({ data: items.map((i) => ({ ...i, consumptionId: consumption.id })) });
  return {
    status: "APPLIED",
    totalCost: items.reduce((acc, i) => acc.plus(D(i.totalCost)), D(0)),
  };
}

/** Puts consumed stock back (e.g. the appointment was moved out of COMPLETED). Idempotent. */
export async function reverseBookingConsumption(tx: Tx, bookingId: string, userId?: string | null) {
  const consumption = await tx.bookingConsumption.findUnique({
    where: { bookingId },
    include: { items: true },
  });
  if (!consumption || consumption.status !== "APPLIED") return { reversed: false };
  for (const item of consumption.items) {
    await stockIn(tx, {
      salonId: consumption.salonId,
      branchId: consumption.branchId,
      productId: item.productId,
      quantity: D(item.quantity),
      unitCost: D(item.unitCost),
      type: "CONSUMPTION_REVERSAL",
      referenceType: "BOOKING",
      referenceId: bookingId,
      reason: "Booking consumption reversed",
      userId,
      skipAverage: true,
    });
  }
  await tx.bookingConsumption.update({
    where: { id: consumption.id },
    data: { status: "REVERSED", reversedAt: new Date() },
  });
  return { reversed: true };
}

/** Inventory valuation for a set of stock rows: Σ(max(qty,0) × avgCost) */
export function valuate(rows: { quantity: Prisma.Decimal | Decimal; avgCost: Prisma.Decimal | Decimal; fallbackCost?: Prisma.Decimal | Decimal }[]) {
  return rows.reduce((acc, r) => {
    const q = max(D(r.quantity), D(0));
    const cost = D(r.avgCost).greaterThan(0) ? D(r.avgCost) : D(r.fallbackCost);
    return acc.plus(q.times(cost));
  }, D(0));
}
