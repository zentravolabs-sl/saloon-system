import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, parseQuery, csvResponse } from "@/lib/ops/api";
import { branchWhere } from "@/lib/ops/access";
import { D, money, sum, Decimal } from "@/lib/money";
import { countedExpenseWhere, expenseDateFilter } from "@/lib/ops/expenses";
import { bucketKey, formatDay, todayInTz, addDays } from "@/lib/ops/periods";
import { dayStr } from "@/lib/ops/schemas";

const query = z.object({
  granularity: z.enum(["daily", "weekly", "monthly", "yearly"]).default("monthly"),
  from: dayStr.optional(),
  to: dayStr.optional(),
  branchId: z.string().optional(),
  categoryId: z.string().optional(),
  export: z.enum(["csv"]).optional(),
});

/** Daily/weekly/monthly/yearly expense summaries (APPROVED, non-deleted, non-voided only) */
export const GET = route({ permission: "expense.view" }, async ({ ctx, req }) => {
  const q = parseQuery(req, query);
  const today = todayInTz();
  const defaultDays = { daily: 30, weekly: 90, monthly: 365, yearly: 365 * 4 }[q.granularity];
  const from = q.from || formatDay(addDays(today, -defaultDays));
  const to = q.to || formatDay(today);

  const rows = await prisma.expense.findMany({
    where: {
      ...countedExpenseWhere(ctx.salonId),
      ...(await branchWhere(ctx, q.branchId)),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      expenseDate: expenseDateFilter(from, to),
    },
    select: {
      expenseDate: true,
      amount: true,
      category: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });

  const buckets = new Map<string, { amount: Decimal; count: number }>();
  const byCategory = new Map<string, { name: string; amount: Decimal; count: number }>();
  const byBranch = new Map<string, { name: string; amount: Decimal; count: number }>();
  for (const r of rows) {
    const key = bucketKey(r.expenseDate, q.granularity);
    const b = buckets.get(key) || { amount: D(0), count: 0 };
    b.amount = b.amount.plus(D(r.amount));
    b.count++;
    buckets.set(key, b);

    const c = byCategory.get(r.category.id) || { name: r.category.name, amount: D(0), count: 0 };
    c.amount = c.amount.plus(D(r.amount));
    c.count++;
    byCategory.set(r.category.id, c);

    const br = byBranch.get(r.branch.id) || { name: r.branch.name, amount: D(0), count: 0 };
    br.amount = br.amount.plus(D(r.amount));
    br.count++;
    byBranch.set(r.branch.id, br);
  }

  const periods = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({ period, amount: money(v.amount), count: v.count }));
  const categories = Array.from(byCategory.entries())
    .map(([id, v]) => ({ id, name: v.name, amount: money(v.amount), count: v.count }))
    .sort((a, b) => Number(b.amount) - Number(a.amount));
  const branches = Array.from(byBranch.entries())
    .map(([id, v]) => ({ id, name: v.name, amount: money(v.amount), count: v.count }))
    .sort((a, b) => Number(b.amount) - Number(a.amount));
  const total = money(sum(rows.map((r) => r.amount)));

  if (q.export === "csv") {
    return csvResponse(`expense-summary-${q.granularity}.csv`, [
      ["Period", "Expense count", "Total"],
      ...periods.map((p) => [p.period, p.count, p.amount]),
      [],
      ["Category", "Expense count", "Total"],
      ...categories.map((c) => [c.name, c.count, c.amount]),
      [],
      ["Branch", "Expense count", "Total"],
      ...branches.map((b) => [b.name, b.count, b.amount]),
      [],
      ["TOTAL", rows.length, total],
    ]);
  }

  return { granularity: q.granularity, from, to, total, count: rows.length, periods, categories, branches };
});
