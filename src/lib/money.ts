import Decimal from "decimal.js";

/**
 * Decimal-safe money helpers. NEVER use JS floats for monetary maths.
 *
 *  - Pass values to Prisma Decimal columns as strings (`money(d)` / `qty(d)`).
 *  - Convert values read from Prisma with `D(value)`.
 *  - Only convert to `number` at the very edge for display (`toNumber`).
 */
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };
export type Dec = Decimal;

type Decimalish = Decimal.Value | { toString(): string } | null | undefined;

export function D(value: Decimalish): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  if (value instanceof Decimal) return value;
  if (typeof value === "number" || typeof value === "string") return new Decimal(value);
  return new Decimal(value.toString());
}

export const ZERO = new Decimal(0);

export function round2(v: Decimal): Decimal {
  return v.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
export function round3(v: Decimal): Decimal {
  return v.toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
}
export function round4(v: Decimal): Decimal {
  return v.toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
}

/** String for a DECIMAL(x,2) column */
export function money(v: Decimalish): string {
  return round2(D(v)).toFixed(2);
}
/** String for a DECIMAL(x,3) quantity column */
export function qty(v: Decimalish): string {
  return round3(D(v)).toFixed(3);
}
/** String for a DECIMAL(x,4) cost/rate column */
export function rate4(v: Decimalish): string {
  return round4(D(v)).toFixed(4);
}

/** Display-only conversion */
export function toNumber(v: Decimalish): number {
  return round2(D(v)).toNumber();
}

export function sum(values: Decimalish[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(D(v)), new Decimal(0));
}

export function max(a: Decimal, b: Decimal): Decimal {
  return a.greaterThan(b) ? a : b;
}
export function min(a: Decimal, b: Decimal): Decimal {
  return a.lessThan(b) ? a : b;
}

/**
 * Splits `total` across weights so the parts add up to exactly `total` (2dp).
 * The rounding remainder goes to the last non-zero weight.
 */
export function allocate(total: Decimal, weights: Decimal[]): Decimal[] {
  const totalWeight = sum(weights);
  if (totalWeight.isZero()) return weights.map(() => new Decimal(0));
  const parts = weights.map((w) => round2(total.times(w).div(totalWeight)));
  const allocated = sum(parts);
  const diff = round2(total).minus(allocated);
  if (!diff.isZero()) {
    let idx = weights.length - 1;
    while (idx > 0 && weights[idx].isZero()) idx--;
    parts[idx] = parts[idx].plus(diff);
  }
  return parts;
}

export function valuate(
  levels: Array<{ quantity: Decimalish; avgCost?: Decimalish; fallbackCost?: Decimalish }>
): Decimal {
  let total = new Decimal(0);
  for (const l of levels) {
    const cost = D(l.avgCost && D(l.avgCost).greaterThan(0) ? l.avgCost : l.fallbackCost);
    total = total.plus(D(l.quantity).times(cost));
  }
  return total;
}

export function formatLKR(v: Decimalish, currency = "LKR"): string {
  const n = round2(D(v));
  const [int, dec] = n.abs().toFixed(2).split(".");
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n.isNegative() ? "-" : ""}${currency} ${withCommas}.${dec}`;
}

