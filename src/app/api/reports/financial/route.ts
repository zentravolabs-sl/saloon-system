import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, parseQuery, csvResponse } from "@/lib/ops/api";
import { branchWhere } from "@/lib/ops/access";
import { D, money, sum } from "@/lib/money";
import { countedExpenseWhere, expenseDateFilter } from "@/lib/ops/expenses";
import { bucketKey, endOfDayUTC, formatDay, parseDay, todayInTz, addDays } from "@/lib/ops/periods";
import { dayStr } from "@/lib/ops/schemas";

const query = z.object({
  from: dayStr.optional(),
  to: dayStr.optional(),
  branchId: z.string().optional(),
  export: z.enum(["csv"]).optional(),
});

/**
 * Consolidated Financial & Profitability Dashboard API
 *
 * Formulas:
 *  - Service Revenue = Sum(Booking.totalAmount WHERE status = 'COMPLETED')
 *  - Product Revenue = Sum(Sale.totalAmount - Sale.refundedAmount WHERE status != 'VOIDED')
 *  - Total Revenue = Service Revenue + Product Revenue
 *  - Cost of Goods Sold (COGS) = Sum(SaleItem.quantity * SaleItem.unitCost) + Sum(BookingConsumptionItem.totalCost)
 *  - Gross Profit = Total Revenue - COGS
 *  - Operating Expenses = Counted Expenses (APPROVED, not deleted, not voided) excluding Staff expenses
 *  - Staff Salary Expenses = Sum(PayrollRecord.grossAmount WHERE status = 'PAID' or 'APPROVED')
 *  - Net Operating Profit = Gross Profit - Operating Expenses - Staff Salary Expenses
 */
export const GET = route({ permission: "finance.view" }, async ({ ctx, req }) => {
  const q = parseQuery(req, query);
  const today = todayInTz();
  const from = q.from || formatDay(addDays(today, -30));
  const to = q.to || formatDay(today);

  const fromDate = parseDay(from);
  const toDate = endOfDayUTC(parseDay(to));
  const bWhere = await branchWhere(ctx, q.branchId);

  // 1. Service Revenue from completed Bookings
  const bookings = await prisma.booking.findMany({
    where: {
      salonId: ctx.salonId,
      status: "COMPLETED",
      bookingDate: { gte: fromDate, lte: toDate },
      ...bWhere,
    },
    select: {
      id: true,
      bookingDate: true,
      totalAmount: true,
      paidAmount: true,
      branchId: true,
      branch: { select: { name: true } },
    },
  });

  const serviceRevenue = sum(bookings.map((b) => b.totalAmount));

  // 2. Product Revenue from Retail Sales
  const sales = await prisma.sale.findMany({
    where: {
      salonId: ctx.salonId,
      status: { not: "VOIDED" },
      createdAt: { gte: fromDate, lte: toDate },
      ...bWhere,
    },
    select: {
      id: true,
      createdAt: true,
      totalAmount: true,
      refundedAmount: true,
      paidAmount: true,
      branchId: true,
      branch: { select: { name: true } },
      items: { select: { quantity: true, unitCost: true } },
    },
  });

  const productGross = sum(sales.map((s) => s.totalAmount));
  const productRefunds = sum(sales.map((s) => s.refundedAmount));
  const productRevenue = productGross.minus(productRefunds);

  // 3. Cost of Goods Sold (COGS)
  let retailCogs = D(0);
  for (const s of sales) {
    for (const item of s.items) {
      retailCogs = retailCogs.plus(D(item.quantity).times(D(item.unitCost)));
    }
  }

  const consumptions = await prisma.bookingConsumption.findMany({
    where: {
      salonId: ctx.salonId,
      status: "APPLIED",
      appliedAt: { gte: fromDate, lte: toDate },
      ...bWhere,
    },
    include: { items: true },
  });

  let serviceCogs = D(0);
  for (const c of consumptions) {
    for (const it of c.items) {
      serviceCogs = serviceCogs.plus(D(it.totalCost));
    }
  }

  const totalCogs = retailCogs.plus(serviceCogs);
  const totalRevenue = serviceRevenue.plus(productRevenue);
  const grossProfit = totalRevenue.minus(totalCogs);

  // 4. Operating Expenses
  const expenses = await prisma.expense.findMany({
    where: {
      ...countedExpenseWhere(ctx.salonId),
      expenseDate: expenseDateFilter(from, to),
      ...bWhere,
    },
    select: {
      id: true,
      amount: true,
      category: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });

  const totalExpenses = sum(expenses.map((e) => e.amount));

  // 5. Staff Salaries & Commissions
  const payrolls = await prisma.payrollRecord.findMany({
    where: {
      salonId: ctx.salonId,
      status: { in: ["APPROVED", "PAID"] },
      periodStart: { gte: fromDate },
      periodEnd: { lte: toDate },
      ...bWhere,
    },
    select: {
      id: true,
      basicAmount: true,
      overtimeAmount: true,
      commissionAmount: true,
      bonusAmount: true,
      grossAmount: true,
      netAmount: true,
      branchId: true,
      branch: { select: { name: true } },
    },
  });

  const staffSalaryExpense = sum(payrolls.map((p) => p.grossAmount));
  const staffCommissionsPaid = sum(payrolls.map((p) => p.commissionAmount));

  // Net Operating Profit
  const netOperatingProfit = grossProfit.minus(totalExpenses).minus(staffSalaryExpense);

  // 6. Outstanding Payments
  const bookingOutstanding = sum(bookings.map((b) => D(b.totalAmount).minus(D(b.paidAmount))));
  const saleOutstanding = sum(sales.map((s) => D(s.totalAmount).minus(D(s.paidAmount))));
  const totalOutstanding = bookingOutstanding.plus(saleOutstanding);

  // Category breakdowns
  const expensesByCategory: Record<string, { name: string; amount: string }> = {};
  for (const exp of expenses) {
    const cId = exp.category.id;
    if (!expensesByCategory[cId]) expensesByCategory[cId] = { name: exp.category.name, amount: "0.00" };
    expensesByCategory[cId].amount = money(D(expensesByCategory[cId].amount).plus(D(exp.amount)));
  }

  // Branch breakdowns
  const branchBreakdown: Record<string, any> = {};
  for (const b of bookings) {
    if (!branchBreakdown[b.branchId]) {
      branchBreakdown[b.branchId] = { branchName: b.branch.name, serviceRevenue: D(0), productRevenue: D(0), expenses: D(0), payroll: D(0) };
    }
    branchBreakdown[b.branchId].serviceRevenue = branchBreakdown[b.branchId].serviceRevenue.plus(D(b.totalAmount));
  }
  for (const s of sales) {
    if (!branchBreakdown[s.branchId]) {
      branchBreakdown[s.branchId] = { branchName: s.branch.name, serviceRevenue: D(0), productRevenue: D(0), expenses: D(0), payroll: D(0) };
    }
    branchBreakdown[s.branchId].productRevenue = branchBreakdown[s.branchId].productRevenue.plus(D(s.totalAmount).minus(D(s.refundedAmount)));
  }
  for (const e of expenses) {
    if (branchBreakdown[e.branch.id]) {
      branchBreakdown[e.branch.id].expenses = branchBreakdown[e.branch.id].expenses.plus(D(e.amount));
    }
  }

  const branches = Object.entries(branchBreakdown).map(([id, val]) => ({
    branchId: id,
    branchName: val.branchName,
    serviceRevenue: money(val.serviceRevenue),
    productRevenue: money(val.productRevenue),
    totalRevenue: money(val.serviceRevenue.plus(val.productRevenue)),
    expenses: money(val.expenses),
  }));

  if (q.export === "csv") {
    return csvResponse("financial-report.csv", [
      ["Metric", "Amount (LKR)"],
      ["Total Recognized Revenue", money(totalRevenue)],
      ["Service Revenue", money(serviceRevenue)],
      ["Product Revenue", money(productRevenue)],
      ["Cost of Goods Sold (COGS)", money(totalCogs)],
      ["Gross Profit", money(grossProfit)],
      ["Operating Expenses", money(totalExpenses)],
      ["Staff Salary & Payroll", money(staffSalaryExpense)],
      ["Staff Commissions Paid", money(staffCommissionsPaid)],
      ["Net Operating Profit", money(netOperatingProfit)],
      ["Total Outstanding Receivables", money(totalOutstanding)],
    ]);
  }

  return {
    from,
    to,
    summary: {
      totalRevenue: money(totalRevenue),
      serviceRevenue: money(serviceRevenue),
      productRevenue: money(productRevenue),
      cogs: money(totalCogs),
      grossProfit: money(grossProfit),
      operatingExpenses: money(totalExpenses),
      staffSalaryExpense: money(staffSalaryExpense),
      staffCommissionsPaid: money(staffCommissionsPaid),
      netOperatingProfit: money(netOperatingProfit),
      outstandingPayments: money(totalOutstanding),
    },
    expensesByCategory: Object.values(expensesByCategory),
    branches,
  };
});
