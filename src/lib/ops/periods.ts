import { addDays, addMonths, addWeeks, addYears } from "date-fns";

export type Granularity = "daily" | "weekly" | "monthly" | "yearly";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses "YYYY-MM-DD" into a UTC-midnight Date (the convention used for bookingDate etc.) */
export function parseDay(value: string): Date {
  if (!DAY_RE.test(value)) throw new Error(`Invalid date: ${value}`);
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d;
}

export function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Inclusive end of a UTC day */
export function endOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

/** Today's calendar date (as UTC-midnight Date) in a given IANA timezone */
export function todayInTz(timezone = "Asia/Colombo", now = new Date()): Date {
  const str = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parseDay(str);
}

/** Monday-based week start (UTC) */
export function startOfWeekUTC(d: Date): Date {
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
}

export function bucketKey(d: Date, granularity: Granularity): string {
  const iso = formatDay(d);
  switch (granularity) {
    case "daily":
      return iso;
    case "weekly":
      return formatDay(startOfWeekUTC(d));
    case "monthly":
      return iso.slice(0, 7);
    case "yearly":
      return iso.slice(0, 4);
  }
}

/**
 * The next occurrence of a recurring schedule after `current`, anchored to the original
 * start date so a "31st of the month" rule does not drift to the 28th permanently.
 */
export function nextOccurrence(
  start: Date,
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY",
  current: Date
): Date {
  if (frequency === "WEEKLY") return addWeeks(current, 1);
  const stepMonths = frequency === "MONTHLY" ? 1 : 12;
  const elapsedMonths =
    (current.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (current.getUTCMonth() - start.getUTCMonth());
  const nextIndex = Math.floor(elapsedMonths / stepMonths) + 1;
  const candidate = addMonthsUTC(start, nextIndex * stepMonths);
  return candidate.getTime() > current.getTime()
    ? candidate
    : addMonthsUTC(start, (nextIndex + 1) * stepMonths);
}

/** Adds months in UTC, clamping to the month's last day (Jan 31 + 1 month = Feb 28/29) */
export function addMonthsUTC(d: Date, months: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const day = d.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, lastDay)));
}

export { addDays, addMonths, addWeeks, addYears };

/** First and last (inclusive) UTC days of a calendar month (month is 1-12) */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}
