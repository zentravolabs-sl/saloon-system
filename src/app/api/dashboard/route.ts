import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccessContext, getAccessContext } from "@/lib/ops/access";
import { errorResponse } from "@/lib/ops/api";
import { addDays, formatDay, todayInTz } from "@/lib/ops/periods";

/**
 * One role-aware endpoint that powers every dashboard. The caller's identity, salon, branch
 * scope and staff profile come from the server session - nothing is taken from the request.
 * Financial figures are only computed for roles allowed to see them.
 */

const apptSelect = {
  id: true,
  reference: true,
  bookingDate: true,
  startTime: true,
  endTime: true,
  status: true,
  paymentStatus: true,
  totalAmount: true,
  paidAmount: true,
  customer: { select: { name: true, phone: true } },
  staff: { select: { id: true, name: true } },
  branch: { select: { name: true } },
  services: { select: { service: { select: { name: true } } } },
} as const;

type Appt = {
  id: string;
  reference: string;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  customer: { name: string; phone: string };
  staff: { id: string; name: string };
  branch: { name: string };
  services: { service: { name: string } }[];
};

const shape = (b: Appt) => ({
  id: b.id,
  reference: b.reference,
  date: formatDay(b.bookingDate),
  startTime: b.startTime,
  endTime: b.endTime,
  status: b.status,
  paymentStatus: b.paymentStatus,
  total: b.totalAmount,
  balance: Math.max(0, b.totalAmount - b.paidAmount),
  customerName: b.customer.name,
  customerPhone: b.customer.phone,
  staffId: b.staff.id,
  staffName: b.staff.name,
  branchName: b.branch.name,
  services: b.services.map((s) => s.service.name),
});

/** Offset (ms) of a timezone from UTC at a given instant */
function tzOffsetMs(timezone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - at.getTime();
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

export async function GET() {
  try {
    const ctx = await getAccessContext();
    const salon = await prisma.salon.findUnique({
      where: { id: ctx.salonId },
      select: { timezone: true, currency: true },
    });
    const tz = salon?.timezone || "Asia/Colombo";
    const now = new Date();
    const today = todayInTz(tz, now); // salon-local calendar day as UTC midnight
    const tomorrow = addDays(today, 1);
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    const offset = tzOffsetMs(tz, now);
    // Real instants for "today" / "this month" in the salon's timezone (for createdAt columns)
    const dayStartAt = new Date(today.getTime() - offset);
    const dayEndAt = new Date(tomorrow.getTime() - offset);
    const monthStartAt = new Date(monthStart.getTime() - offset);
    const monthEndAt = new Date(nextMonth.getTime() - offset);
    const nowHHMM = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(now);

    const scoped = ctx.branchScope !== "ALL" && ctx.branchScope.length > 0 ? ctx.branchScope : null;
    const branchFilter = scoped ? { branchId: { in: scoped } } : {};
    const base = { salonId: ctx.salonId, ...branchFilter };

    const meta = { role: ctx.role, userName: ctx.userName, currency: salon?.currency || "LKR", today: formatDay(today) };

    if (ctx.role === "STAFF") {
      return NextResponse.json({ ...meta, ...(await staffDashboard(ctx, today, tomorrow, monthStartAt, monthEndAt)) });
    }
    if (ctx.role === "RECEPTIONIST") {
      return NextResponse.json({ ...meta, ...(await frontDeskDashboard(base, today, tomorrow)) });
    }
    if (ctx.role === "MANAGER") {
      return NextResponse.json({
        ...meta,
        ...(await managerDashboard(ctx, base, scoped, today, tomorrow, monthStart, nextMonth)),
      });
    }
    return NextResponse.json({
      ...meta,
      ...(await ownerDashboard(ctx, base, today, tomorrow, monthStart, nextMonth, dayStartAt, dayEndAt, monthStartAt, monthEndAt, nowHHMM)),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

type Base = { salonId: string; branchId?: { in: string[] } };

async function frontDeskDashboard(base: Base, today: Date, tomorrow: Date) {
  const rows = (await prisma.booking.findMany({
    where: { ...base, bookingDate: { gte: today, lt: tomorrow }, status: { notIn: ["CANCELLED", "REJECTED"] } },
    select: apptSelect,
    orderBy: { startTime: "asc" },
    take: 200,
  })) as unknown as Appt[];
  const list = rows.map(shape);
  return {
    kind: "frontdesk",
    counts: {
      total: list.length,
      waiting: list.filter((b) => b.status === "CHECKED_IN").length,
      inProgress: list.filter((b) => b.status === "IN_PROGRESS").length,
      upcoming: list.filter((b) => b.status === "PENDING" || b.status === "CONFIRMED").length,
      completed: list.filter((b) => b.status === "COMPLETED").length,
      toBill: list.filter((b) => b.status === "COMPLETED" && b.paymentStatus !== "PAID").length,
    },
    appointments: list,
  };
}

async function managerDashboard(
  ctx: AccessContext,
  base: Base,
  scoped: string[] | null,
  today: Date,
  tomorrow: Date,
  monthStart: Date,
  nextMonth: Date
) {
  const branches = await prisma.branch.findMany({
    where: { salonId: ctx.salonId, ...(scoped ? { id: { in: scoped } } : {}) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const dow = today.getUTCDay();

  const [byStatus, staff, busyNow, leaves, pendingBookings, unpaidDone, expensesPending, levels, monthly, todayByBranch] =
    await Promise.all([
      prisma.booking.groupBy({
        by: ["status"],
        where: { ...base, bookingDate: { gte: today, lt: tomorrow } },
        _count: { _all: true },
      }),
      prisma.staff.findMany({
        where: {
          salonId: ctx.salonId,
          status: { not: "INACTIVE" },
          ...(scoped ? { OR: [{ primaryBranchId: { in: scoped } }, { branches: { some: { branchId: { in: scoped } } } }] } : {}),
        },
        select: { id: true, name: true, specialization: true, schedules: { where: { dayOfWeek: dow } } },
        orderBy: { name: "asc" },
      }),
      prisma.booking.findMany({
        where: { ...base, bookingDate: { gte: today, lt: tomorrow }, status: "IN_PROGRESS" },
        select: { staffId: true },
      }),
      prisma.staffLeave.findMany({
        where: { salonId: ctx.salonId, approved: true, isFullDay: true, startDate: { lte: today }, endDate: { gte: today } },
        select: { staffId: true },
      }),
      prisma.booking.count({ where: { ...base, status: "PENDING", bookingDate: { gte: today } } }),
      prisma.booking.count({
        where: { ...base, status: "COMPLETED", paymentStatus: { not: "PAID" }, bookingDate: { gte: addDays(today, -7), lt: tomorrow } },
      }),
      prisma.expense.count({ where: { ...base, status: "PENDING", deletedAt: null } }),
      prisma.stockLevel.findMany({
        where: { ...base, product: { isActive: true, archivedAt: null, minStock: { gt: 0 } } },
        select: { quantity: true, product: { select: { minStock: true } } },
      }),
      prisma.booking.groupBy({
        by: ["branchId"],
        where: { ...base, status: "COMPLETED", bookingDate: { gte: monthStart, lt: nextMonth } },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      prisma.booking.groupBy({
        by: ["branchId"],
        where: { ...base, bookingDate: { gte: today, lt: tomorrow }, status: { notIn: ["CANCELLED", "REJECTED"] } },
        _count: { _all: true },
      }),
    ]);

  const busy = new Set(busyNow.map((b) => b.staffId));
  const onLeave = new Set(leaves.map((l) => l.staffId));
  const lowStockCount = levels.filter((l) => num(l.quantity) <= num(l.product.minStock)).length;
  const count = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;

  return {
    kind: "manager",
    bookings: {
      total: byStatus.filter((x) => !["CANCELLED", "REJECTED"].includes(x.status)).reduce((a, x) => a + x._count._all, 0),
      pending: count("PENDING"),
      confirmed: count("CONFIRMED"),
      waiting: count("CHECKED_IN"),
      inProgress: count("IN_PROGRESS"),
      completed: count("COMPLETED"),
      cancelled: count("CANCELLED") + count("NO_SHOW"),
    },
    staff: staff.map((s) => {
      const sched = s.schedules[0];
      const state = onLeave.has(s.id)
        ? "leave"
        : sched && !sched.isWorking
        ? "off"
        : busy.has(s.id)
        ? "busy"
        : "available";
      return {
        id: s.id,
        name: s.name,
        specialization: s.specialization,
        state,
        hours: sched && sched.isWorking ? `${sched.startTime} - ${sched.endTime}` : null,
      };
    }),
    alerts: {
      pendingBookings,
      unpaidDone,
      expensesPending,
      lowStockCount,
    },
    branches: branches.map((b) => {
      const m = monthly.find((x) => x.branchId === b.id);
      const t = todayByBranch.find((x) => x.branchId === b.id);
      return {
        id: b.id,
        name: b.name,
        todayBookings: t?._count._all ?? 0,
        monthCompleted: m?._count._all ?? 0,
        monthRevenue: num(m?._sum.totalAmount),
      };
    }),
  };
}

async function ownerDashboard(
  ctx: AccessContext,
  base: Base,
  today: Date,
  tomorrow: Date,
  monthStart: Date,
  nextMonth: Date,
  dayStartAt: Date,
  dayEndAt: Date,
  monthStartAt: Date,
  monthEndAt: Date,
  nowHHMM: string
) {
  const bookingOf = { booking: base };
  const [
    todayBookings, payToday, salesToday, payMonth, salesMonth, expenses, perf, levels, upcoming,
  ] = await Promise.all([
    prisma.booking.count({
      where: { ...base, bookingDate: { gte: today, lt: tomorrow }, status: { notIn: ["CANCELLED", "REJECTED"] } },
    }),
    prisma.payment.aggregate({ where: { ...bookingOf, createdAt: { gte: dayStartAt, lt: dayEndAt } }, _sum: { amount: true } }),
    prisma.sale.aggregate({
      where: { ...base, status: { not: "VOIDED" }, createdAt: { gte: dayStartAt, lt: dayEndAt } },
      _sum: { paidAmount: true, refundedAmount: true },
    }),
    prisma.payment.aggregate({ where: { ...bookingOf, createdAt: { gte: monthStartAt, lt: monthEndAt } }, _sum: { amount: true } }),
    prisma.sale.aggregate({
      where: { ...base, status: { not: "VOIDED" }, createdAt: { gte: monthStartAt, lt: monthEndAt } },
      _sum: { paidAmount: true, refundedAmount: true },
    }),
    prisma.expense.aggregate({
      where: { ...base, deletedAt: null, status: "APPROVED", expenseDate: { gte: monthStart, lt: nextMonth } },
      _sum: { amount: true },
    }),
    prisma.booking.groupBy({
      by: ["staffId"],
      where: { ...base, status: "COMPLETED", bookingDate: { gte: monthStart, lt: nextMonth } },
      _count: { _all: true },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 6,
    }),
    prisma.stockLevel.findMany({
      where: { ...base, product: { isActive: true, archivedAt: null, minStock: { gt: 0 } } },
      select: {
        quantity: true,
        product: { select: { name: true, unit: true, minStock: true } },
        branch: { select: { name: true } },
      },
    }),
    prisma.booking.findMany({
      where: { ...base, bookingDate: { gte: today, lt: addDays(today, 8) }, status: { in: ["PENDING", "CONFIRMED"] } },
      select: apptSelect,
      orderBy: [{ bookingDate: "asc" }, { startTime: "asc" }],
      take: 40,
    }),
  ]);

  const staffNames = await prisma.staff.findMany({
    where: { id: { in: perf.map((p) => p.staffId) } },
    select: { id: true, name: true },
  });
  const name = (id: string) => staffNames.find((s) => s.id === id)?.name || "—";

  const retail = (a: { _sum: { paidAmount: unknown; refundedAmount: unknown } }) =>
    num(a._sum.paidAmount) - num(a._sum.refundedAmount);
  const monthlyRevenue = num(payMonth._sum.amount) + retail(salesMonth);
  const totalExpenses = num(expenses._sum.amount);

  const low = levels
    .filter((l) => num(l.quantity) <= num(l.product.minStock))
    .sort((a, b) => num(a.quantity) - num(b.quantity));

  const upcomingList = (upcoming as unknown as Appt[])
    .filter((b) => formatDay(b.bookingDate) !== formatDay(today) || b.endTime >= nowHHMM)
    .slice(0, 8)
    .map(shape);

  return {
    kind: "owner",
    todayRevenue: num(payToday._sum.amount) + retail(salesToday),
    todayBookings,
    monthlyRevenue,
    totalExpenses,
    estimatedProfit: monthlyRevenue - totalExpenses,
    staffPerformance: perf.map((p) => ({
      staffId: p.staffId,
      name: name(p.staffId),
      completed: p._count._all,
      revenue: num(p._sum.totalAmount),
    })),
    lowStock: {
      count: low.length,
      items: low.slice(0, 6).map((l) => ({
        name: l.product.name,
        unit: l.product.unit,
        branch: l.branch.name,
        quantity: num(l.quantity),
        minStock: num(l.product.minStock),
      })),
    },
    upcoming: upcomingList,
  };
}

async function staffDashboard(
  ctx: AccessContext,
  today: Date,
  tomorrow: Date,
  monthStartAt: Date,
  monthEndAt: Date
) {
  if (!ctx.staffId) return { kind: "staff", linked: false };
  const dow = today.getUTCDay();
  const [todayRows, upcomingRows, schedule, leave, commission] = await Promise.all([
    prisma.booking.findMany({
      where: {
        salonId: ctx.salonId,
        staffId: ctx.staffId,
        bookingDate: { gte: today, lt: tomorrow },
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
      select: apptSelect,
      orderBy: { startTime: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        salonId: ctx.salonId,
        staffId: ctx.staffId,
        bookingDate: { gte: tomorrow, lt: addDays(today, 15) },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: apptSelect,
      orderBy: [{ bookingDate: "asc" }, { startTime: "asc" }],
      take: 20,
    }),
    prisma.staffSchedule.findUnique({ where: { staffId_dayOfWeek: { staffId: ctx.staffId, dayOfWeek: dow } } }),
    prisma.staffLeave.findFirst({
      where: { staffId: ctx.staffId, approved: true, isFullDay: true, startDate: { lte: today }, endDate: { gte: today } },
      select: { id: true },
    }),
    prisma.commissionEntry.groupBy({
      by: ["status"],
      where: {
        salonId: ctx.salonId,
        staffId: ctx.staffId,
        status: { not: "VOIDED" },
        earnedAt: { gte: monthStartAt, lt: monthEndAt },
      },
      _sum: { amount: true },
    }),
  ]);

  const sum = (s: string) => num(commission.find((c) => c.status === s)?._sum.amount);
  return {
    kind: "staff",
    linked: true,
    today: (todayRows as unknown as Appt[]).map(shape),
    upcoming: (upcomingRows as unknown as Appt[]).map(shape),
    hours: {
      onLeave: !!leave,
      working: !!schedule?.isWorking && !leave,
      start: schedule?.startTime ?? null,
      end: schedule?.endTime ?? null,
    },
    earnings: {
      pending: sum("PENDING"),
      approved: sum("APPROVED"),
      paid: sum("PAID"),
      total: sum("PENDING") + sum("APPROVED") + sum("PAID"),
    },
  };
}
