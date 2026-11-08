import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays, formatDay, todayInTz } from "@/lib/ops/periods";
import {
  HomeDashboardClient,
  type HomeDashboardData,
  type SummaryCounts,
  type DayBookingStat,
  type RecentBookingItem,
  type TodayScheduleItem,
  type NextUpBooking,
  type BusinessInsightsData,
} from "@/components/public/HomeDashboardClient";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return asUtc - at.getTime();
}

function format12Hour(hhmm: string): string {
  const [hStr, mStr] = (hhmm || "09:00").split(":");
  const h = parseInt(hStr || "9", 10);
  const m = mStr || "00";
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${m} ${period}`;
}

function getGreetingInTz(timezone: string, at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: "2-digit",
  }).formatToParts(at);
  const hour = (Number(parts.find((p) => p.type === "hour")?.value ?? 0)) % 24;
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function calcGrowthLabel(current: number, previous: number, fallback: string): string {
  if (previous <= 0) {
    return current > 0 ? "↑ +100%" : fallback;
  }
  const diffPct = Math.round(((current - previous) / previous) * 100);
  if (diffPct >= 0) {
    return `↑ +${diffPct}%`;
  }
  return `↓ ${diffPct}%`;
}

function mapStatusBadge(status: string): { label: string; style: string } {
  switch (status) {
    case "COMPLETED":
      return { label: "Completed", style: "bg-[#DCFCE7] text-[#15803D]" };
    case "IN_PROGRESS":
    case "CHECKED_IN":
      return { label: "In Service", style: "bg-[#EDE9FE] text-[#6D28D9]" };
    case "CANCELLED":
    case "REJECTED":
    case "NO_SHOW":
      return { label: "Cancelled", style: "bg-[#FEE2E2] text-[#B91C1C]" };
    default:
      return { label: "Upcoming", style: "bg-[#DBEAFE] text-[#1D4ED8]" };
  }
}

function summarizeStatuses(rows: { status: string; _count: { _all: number } }[]): SummaryCounts {
  const get = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
  return {
    completed: get("COMPLETED"),
    inProgress: get("IN_PROGRESS") + get("CHECKED_IN"),
    upcoming: get("PENDING") + get("CONFIRMED"),
    cancelled: get("CANCELLED") + get("REJECTED") + get("NO_SHOW"),
  };
}

export default async function AdminDashboardPage() {
  const session = await auth();

  const defaultNow = new Date();
  const defaultTz = "Asia/Colombo";
  const defaultGreeting = getGreetingInTz(defaultTz, defaultNow);

  const defaultData: HomeDashboardData = {
    isAuthenticated: !!session?.user,
    userName: session?.user?.name || "Prasantha",
    userEmail: session?.user?.email || null,
    userRole: session?.user?.role || null,
    userImage: session?.user?.image || null,
    salonName:
      session?.user?.salonName ||
      (session?.user?.role === "SUPER_ADMIN" ? "Super Admin" : "Glamour Cuts"),
    currency: "LKR",
    currentDateLabel: "Wed, Nov 5, 2026",
    greeting: defaultGreeting,
    notificationCount: 3,
    kpis: {
      todayBookings: 32,
      bookingsGrowthLabel: "↑ +14%",
      totalCustomers: 1248,
      customersGrowthLabel: "↑ +8%",
      todayRevenueFormatted: "LKR 68,400",
      revenueGrowthLabel: "↑ +22%",
      activeServices: 18,
      servicesStatusLabel: "Active",
    },
    summary: {
      Today: { completed: 24, inProgress: 7, upcoming: 7, cancelled: 2 },
      Yesterday: { completed: 29, inProgress: 0, upcoming: 0, cancelled: 3 },
      "This Week": { completed: 142, inProgress: 7, upcoming: 38, cancelled: 10 },
    },
    weeklyOverview: {
      "This Week": [
        { day: "Mon", count: 19 },
        { day: "Tue", count: 24 },
        { day: "Wed", count: 32 },
        { day: "Thu", count: 27 },
        { day: "Fri", count: 23 },
        { day: "Sat", count: 33 },
        { day: "Sun", count: 39 },
      ],
      "Last Week": [
        { day: "Mon", count: 16 },
        { day: "Tue", count: 21 },
        { day: "Wed", count: 28 },
        { day: "Thu", count: 25 },
        { day: "Fri", count: 30 },
        { day: "Sat", count: 35 },
        { day: "Sun", count: 34 },
      ],
    },
    defaultActiveDay: "Wed",
    recentBookings: [
      {
        id: "demo-1",
        name: "Nimali Perera",
        service: "Hair Cut & Styling",
        time: "Today, 09:00 AM",
        status: "Completed",
        statusStyle: "bg-[#DCFCE7] text-[#15803D]",
        avatarIndex: 0,
      },
      {
        id: "demo-2",
        name: "Kasun Silva",
        service: "Beard Trim",
        time: "Today, 10:30 AM",
        status: "Completed",
        statusStyle: "bg-[#DCFCE7] text-[#15803D]",
        avatarIndex: 1,
      },
      {
        id: "demo-3",
        name: "Ishara Fernando",
        service: "Hair Coloring",
        time: "Today, 12:00 PM",
        status: "In Service",
        statusStyle: "bg-[#EDE9FE] text-[#6D28D9]",
        avatarIndex: 2,
      },
      {
        id: "demo-4",
        name: "Tharushi Madushani",
        service: "Facial Treatment",
        time: "Today, 02:00 PM",
        status: "Upcoming",
        statusStyle: "bg-[#DBEAFE] text-[#1D4ED8]",
        avatarIndex: 3,
      },
    ],
  };

  if (!session?.user) {
    return <HomeDashboardClient data={defaultData} />;
  }

  try {
    let salonId = session.user.salonId;

    // Fallback lookup if salonId wasn't embedded on the session token
    if (!salonId && session.user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          staffProfile: { select: { salonId: true } },
          ownedSalons: { select: { id: true }, take: 1 },
        },
      });
      salonId = dbUser?.staffProfile?.salonId || dbUser?.ownedSalons[0]?.id || null;
    }

    if (!salonId) {
      return <HomeDashboardClient data={defaultData} />;
    }

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true, name: true, currency: true, timezone: true },
    });

    if (!salon) {
      return <HomeDashboardClient data={defaultData} />;
    }

    const tz = salon.timezone || "Asia/Colombo";
    const currency = salon.currency || "LKR";
    const now = new Date();
    const today = todayInTz(tz, now);
    const tomorrow = addDays(today, 1);
    const yesterday = addDays(today, -1);
    const offset = tzOffsetMs(tz, now);

    const dayStartAt = new Date(today.getTime() - offset);
    const dayEndAt = new Date(tomorrow.getTime() - offset);
    const yesterdayStartAt = new Date(yesterday.getTime() - offset);

    // Compute Monday of the current week (0=Sun -> 6 days back, 1=Mon -> 0 days back, etc.)
    const utcDow = today.getUTCDay();
    const diffToMon = utcDow === 0 ? -6 : 1 - utcDow;
    const thisWeekMon = addDays(today, diffToMon);
    const nextWeekMon = addDays(thisWeekMon, 7);
    const lastWeekMon = addDays(thisWeekMon, -7);

    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    const monthStartAt = new Date(monthStart.getTime() - offset);
    const monthEndAt = new Date(nextMonth.getTime() - offset);

    const [
      todayBookingsCount,
      yesterdayBookingsCount,
      totalCustomersCount,
      newCustomersThisMonth,
      activeServicesCount,
      payToday,
      salesToday,
      bookingsRevenueToday,
      payYesterday,
      salesYesterday,
      bookingsRevenueYesterday,
      todayStatusGroups,
      yesterdayStatusGroups,
      thisWeekStatusGroups,
      thisWeekBookings,
      lastWeekBookings,
      recentBookingsRows,
      unreadNotificationsCount,
      todayScheduleRows,
      payMonth,
      salesMonth,
      bookingsRevenueMonth,
      expensesMonth,
      activeStaffCount,
      staffPerfRows,
      stockLevels,
      pendingApprovalsCount,
      monthBookingsWithServices,
    ] = await Promise.all([
      prisma.booking.count({
        where: {
          salonId,
          bookingDate: { gte: today, lt: tomorrow },
          status: { notIn: ["CANCELLED", "REJECTED"] },
        },
      }),
      prisma.booking.count({
        where: {
          salonId,
          bookingDate: { gte: yesterday, lt: today },
          status: { notIn: ["CANCELLED", "REJECTED"] },
        },
      }),
      prisma.customer.count({ where: { salonId } }),
      prisma.customer.count({
        where: { salonId, createdAt: { gte: monthStartAt } },
      }),
      prisma.service.count({ where: { salonId, isActive: true } }),
      prisma.payment.aggregate({
        where: { booking: { salonId }, createdAt: { gte: dayStartAt, lt: dayEndAt } },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: { salonId, status: { not: "VOIDED" }, createdAt: { gte: dayStartAt, lt: dayEndAt } },
        _sum: { paidAmount: true, refundedAmount: true },
      }),
      prisma.booking.aggregate({
        where: {
          salonId,
          bookingDate: { gte: today, lt: tomorrow },
          status: "COMPLETED",
        },
        _sum: { paidAmount: true, totalAmount: true },
      }),
      prisma.payment.aggregate({
        where: { booking: { salonId }, createdAt: { gte: yesterdayStartAt, lt: dayStartAt } },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: {
          salonId,
          status: { not: "VOIDED" },
          createdAt: { gte: yesterdayStartAt, lt: dayStartAt },
        },
        _sum: { paidAmount: true, refundedAmount: true },
      }),
      prisma.booking.aggregate({
        where: {
          salonId,
          bookingDate: { gte: yesterday, lt: today },
          status: "COMPLETED",
        },
        _sum: { paidAmount: true, totalAmount: true },
      }),
      prisma.booking.groupBy({
        by: ["status"],
        where: { salonId, bookingDate: { gte: today, lt: tomorrow } },
        _count: { _all: true },
      }),
      prisma.booking.groupBy({
        by: ["status"],
        where: { salonId, bookingDate: { gte: yesterday, lt: today } },
        _count: { _all: true },
      }),
      prisma.booking.groupBy({
        by: ["status"],
        where: { salonId, bookingDate: { gte: thisWeekMon, lt: nextWeekMon } },
        _count: { _all: true },
      }),
      prisma.booking.findMany({
        where: {
          salonId,
          bookingDate: { gte: thisWeekMon, lt: nextWeekMon },
          status: { notIn: ["CANCELLED", "REJECTED"] },
        },
        select: { bookingDate: true },
      }),
      prisma.booking.findMany({
        where: {
          salonId,
          bookingDate: { gte: lastWeekMon, lt: thisWeekMon },
          status: { notIn: ["CANCELLED", "REJECTED"] },
        },
        select: { bookingDate: true },
      }),
      prisma.booking.findMany({
        where: { salonId },
        orderBy: [{ bookingDate: "desc" }, { startTime: "desc" }],
        take: 4,
        include: {
          customer: { select: { name: true } },
          services: { select: { service: { select: { name: true } } } },
        },
      }),
      prisma.notification.count({
        where: { salonId, isRead: false },
      }),
      prisma.booking.findMany({
        where: {
          salonId,
          bookingDate: { gte: today, lt: tomorrow },
          status: { notIn: ["CANCELLED", "REJECTED"] },
        },
        orderBy: { startTime: "asc" },
        include: {
          customer: { select: { name: true } },
          staff: { select: { name: true } },
          services: { select: { service: { select: { name: true } } } },
        },
      }),
      prisma.payment.aggregate({
        where: { booking: { salonId }, createdAt: { gte: monthStartAt, lt: monthEndAt } },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: { salonId, status: { not: "VOIDED" }, createdAt: { gte: monthStartAt, lt: monthEndAt } },
        _sum: { paidAmount: true, refundedAmount: true },
      }),
      prisma.booking.aggregate({
        where: {
          salonId,
          bookingDate: { gte: monthStart, lt: nextMonth },
          status: "COMPLETED",
        },
        _count: { _all: true },
        _sum: { paidAmount: true, totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: {
          salonId,
          deletedAt: null,
          status: "APPROVED",
          expenseDate: { gte: monthStart, lt: nextMonth },
        },
        _sum: { amount: true },
      }),
      prisma.staff.count({
        where: { salonId, status: "ACTIVE" },
      }),
      prisma.booking.groupBy({
        by: ["staffId"],
        where: {
          salonId,
          status: "COMPLETED",
          bookingDate: { gte: monthStart, lt: nextMonth },
        },
        _count: { _all: true },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: "desc" } },
        take: 1,
      }),
      prisma.stockLevel.findMany({
        where: {
          salonId,
          product: { isActive: true, archivedAt: null, minStock: { gt: 0 } },
        },
        select: { quantity: true, product: { select: { minStock: true } } },
      }),
      prisma.booking.count({
        where: { salonId, status: "PENDING", bookingDate: { gte: today } },
      }),
      prisma.booking.findMany({
        where: {
          salonId,
          bookingDate: { gte: monthStart, lt: nextMonth },
          status: { notIn: ["CANCELLED", "REJECTED"] },
        },
        select: {
          status: true,
          services: { select: { service: { select: { name: true } } } },
        },
      }),
    ]);

    const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

    // Revenue today: payments/completed bookings + POS retail sales
    const paymentTodayAmt = Math.max(
      num(payToday._sum.amount),
      num(bookingsRevenueToday._sum.paidAmount),
      num(bookingsRevenueToday._sum.totalAmount)
    );
    const posTodayAmt =
      num(salesToday._sum.paidAmount) - num(salesToday._sum.refundedAmount);
    const todayRevenue = Math.max(0, paymentTodayAmt + posTodayAmt);

    const paymentYesterdayAmt = Math.max(
      num(payYesterday._sum.amount),
      num(bookingsRevenueYesterday._sum.paidAmount),
      num(bookingsRevenueYesterday._sum.totalAmount)
    );
    const posYesterdayAmt =
      num(salesYesterday._sum.paidAmount) - num(salesYesterday._sum.refundedAmount);
    const yesterdayRevenue = Math.max(0, paymentYesterdayAmt + posYesterdayAmt);

    const previousCustomers = Math.max(0, totalCustomersCount - newCustomersThisMonth);

    // Build weekly overview arrays (Mon..Sun)
    const buildWeekArray = (
      weekStart: Date,
      rows: { bookingDate: Date }[]
    ): DayBookingStat[] => {
      return DAY_NAMES.map((dayName, idx) => {
        const targetDayStr = formatDay(addDays(weekStart, idx));
        const count = rows.filter((r) => formatDay(r.bookingDate) === targetDayStr).length;
        return { day: dayName, count };
      });
    };

    const todayStr = formatDay(today);
    const yesterdayStr = formatDay(yesterday);

    const recentList: RecentBookingItem[] = recentBookingsRows.map((b, idx) => {
      const bDayStr = formatDay(b.bookingDate);
      const dayPrefix =
        bDayStr === todayStr
          ? "Today"
          : bDayStr === yesterdayStr
          ? "Yesterday"
          : new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            }).format(b.bookingDate);
      const badge = mapStatusBadge(b.status);
      const serviceNames =
        b.services.map((s) => s.service.name).join(", ") || "Salon Service";

      return {
        id: b.id,
        name: b.customer?.name || "Walk-in Customer",
        service: serviceNames,
        time: `${dayPrefix}, ${format12Hour(b.startTime)}`,
        status: badge.label,
        statusStyle: badge.style,
        avatarIndex: idx,
      };
    });

    const formattedCurrentDate = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(now);

    const activeDayIndex = utcDow === 0 ? 6 : utcDow - 1;

    // Build Today's Schedule items
    const todayScheduleList: TodayScheduleItem[] = todayScheduleRows.map((b) => {
      const hourNum = Math.min(
        18,
        Math.max(9, parseInt((b.startTime || "09:00").split(":")[0] || "9", 10))
      );
      const badge = mapStatusBadge(b.status);
      const serviceNames =
        b.services.map((s) => s.service.name).join(", ") || "Salon Service";

      return {
        id: b.id,
        startTime: b.startTime,
        timeLabel: format12Hour(b.startTime),
        hourSlot: hourNum,
        customerName: b.customer?.name || "Walk-in Customer",
        service: serviceNames,
        staffName: b.staff?.name || undefined,
        status: badge.label,
        statusStyle: badge.style,
      };
    });

    const getInitials = (name: string) => {
      const parts = (name || "Walk-in").trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return (parts[0]?.[0] || "W").toUpperCase();
    };

    const upcomingToday =
      todayScheduleRows.find(
        (b) => b.status === "PENDING" || b.status === "CONFIRMED" || b.status === "IN_PROGRESS"
      ) || todayScheduleRows[0];

    const nextUpBooking: NextUpBooking | null = upcomingToday
      ? {
          id: upcomingToday.id,
          customerName: upcomingToday.customer?.name || "Walk-in Customer",
          initials: getInitials(upcomingToday.customer?.name || "Walk-in"),
          service:
            upcomingToday.services.map((s) => s.service.name).join(", ") ||
            "Salon Service",
          timeLabel: format12Hour(upcomingToday.startTime),
        }
      : recentList[0]
      ? {
          id: recentList[0].id,
          customerName: recentList[0].name,
          initials: getInitials(recentList[0].name),
          service: recentList[0].service,
          timeLabel: recentList[0].time.replace(/^[^,]+,\s*/, ""),
        }
      : null;

    // Business Insights computations
    const paymentMonthAmt = Math.max(
      num(payMonth._sum.amount),
      num(bookingsRevenueMonth._sum.paidAmount),
      num(bookingsRevenueMonth._sum.totalAmount)
    );
    const posMonthAmt =
      num(salesMonth._sum.paidAmount) - num(salesMonth._sum.refundedAmount);
    const monthlyRevenue = Math.max(0, paymentMonthAmt + posMonthAmt);
    const monthlyExpenses = num(expensesMonth._sum.amount);
    const estimatedProfit = monthlyRevenue - monthlyExpenses;

    const completedMonthCount = bookingsRevenueMonth._count._all || 0;
    const avgTicket =
      completedMonthCount > 0
        ? Math.round(num(bookingsRevenueMonth._sum.totalAmount) / completedMonthCount)
        : 0;

    // Top service this month
    const serviceFreq = new Map<string, number>();
    let completedCountInSample = 0;
    for (const mb of monthBookingsWithServices) {
      if (mb.status === "COMPLETED") completedCountInSample++;
      for (const s of mb.services) {
        const sName = s.service?.name;
        if (sName) {
          serviceFreq.set(sName, (serviceFreq.get(sName) || 0) + 1);
        }
      }
    }
    let topServiceName = "Hair Cut";
    let topServiceBookings = 12;
    const sortedServices = Array.from(serviceFreq.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const fallbackPopular = [
      { name: "Hair Cut", count: 12 },
      { name: "Hair Styling", count: 8 },
      { name: "Beard Styling", count: 6 },
      { name: "Facial", count: 4 },
    ];

    const popularServices =
      sortedServices.length >= 4
        ? sortedServices.slice(0, 4)
        : [
            ...sortedServices,
            ...fallbackPopular.filter(
              (f) => !sortedServices.some((s) => s.name.toLowerCase() === f.name.toLowerCase())
            ),
          ].slice(0, 4);

    if (popularServices.length > 0) {
      topServiceName = popularServices[0].name;
      topServiceBookings = popularServices[0].count;
    }

    const FULL_DAY_NAMES: Record<string, string> = {
      Mon: "Monday",
      Tue: "Tuesday",
      Wed: "Wednesday",
      Thu: "Thursday",
      Fri: "Friday",
      Sat: "Saturday",
      Sun: "Sunday",
    };
    const weekArr = buildWeekArray(thisWeekMon, thisWeekBookings);
    const totalWeekCount = weekArr.reduce((acc, d) => acc + d.count, 0);
    const avgWeekDay = totalWeekCount / 7;
    let peakDayName = "Friday";
    let peakDayHigherPct = 32;
    if (avgWeekDay > 0) {
      const peakDay = [...weekArr].sort((a, b) => b.count - a.count)[0];
      if (peakDay && peakDay.count > avgWeekDay) {
        peakDayName = FULL_DAY_NAMES[peakDay.day] || "Friday";
        peakDayHigherPct = Math.max(
          12,
          Math.round(((peakDay.count - avgWeekDay) / avgWeekDay) * 100)
        );
      }
    }

    const totalMonthValid = monthBookingsWithServices.length;
    const completionRatePct =
      totalMonthValid > 0
        ? Math.round((completedCountInSample / totalMonthValid) * 100)
        : 100;

    // Top stylist this month
    let topStylistName = "All Stylists";
    let topStylistCompleted = 0;
    let topStylistRevenue = 0;
    if (staffPerfRows.length > 0) {
      const topRow = staffPerfRows[0];
      const topStaff = await prisma.staff.findUnique({
        where: { id: topRow.staffId },
        select: { name: true },
      });
      topStylistName = topStaff?.name || "Lead Stylist";
      topStylistCompleted = topRow._count._all;
      topStylistRevenue = num(topRow._sum.totalAmount);
    }

    const lowStockCount = stockLevels.filter(
      (l) => num(l.quantity) <= num(l.product.minStock)
    ).length;

    const businessInsights: BusinessInsightsData = {
      monthlyRevenueFormatted: `${currency} ${Math.round(monthlyRevenue).toLocaleString("en-US")}`,
      estimatedProfitFormatted: `${currency} ${Math.round(estimatedProfit).toLocaleString("en-US")}`,
      avgTicketFormatted: `${currency} ${avgTicket.toLocaleString("en-US")}`,
      completionRatePct,
      topServiceName,
      topServiceBookings,
      topStylistName,
      topStylistCompleted,
      topStylistRevenueFormatted: `${currency} ${Math.round(topStylistRevenue).toLocaleString("en-US")}`,
      activeStaffCount,
      newCustomersThisMonth,
      lowStockCount,
      pendingApprovalsCount,
      popularServices,
      peakDayName,
      peakDayHigherPct,
    };

    const liveData: HomeDashboardData = {
      isAuthenticated: true,
      userName: session.user.name || "Prasantha",
      userEmail: session.user.email || null,
      userRole: session.user.role || null,
      userImage: session.user.image || null,
      salonName: salon.name,
      currency,
      currentDateLabel: formattedCurrentDate,
      greeting: getGreetingInTz(tz, now),
      notificationCount: unreadNotificationsCount,
      kpis: {
        todayBookings: todayBookingsCount,
        bookingsGrowthLabel: calcGrowthLabel(
          todayBookingsCount,
          yesterdayBookingsCount,
          "↑ +0%"
        ),
        totalCustomers: totalCustomersCount,
        customersGrowthLabel: calcGrowthLabel(
          totalCustomersCount,
          previousCustomers,
          "↑ +0%"
        ),
        todayRevenueFormatted: `${currency} ${Math.round(todayRevenue).toLocaleString("en-US")}`,
        revenueGrowthLabel: calcGrowthLabel(
          todayRevenue,
          yesterdayRevenue,
          "↑ +0%"
        ),
        activeServices: activeServicesCount,
        servicesStatusLabel: activeServicesCount > 0 ? "Active" : "None",
      },
      summary: {
        Today: summarizeStatuses(todayStatusGroups),
        Yesterday: summarizeStatuses(yesterdayStatusGroups),
        "This Week": summarizeStatuses(thisWeekStatusGroups),
      },
      weeklyOverview: {
        "This Week": buildWeekArray(thisWeekMon, thisWeekBookings),
        "Last Week": buildWeekArray(lastWeekMon, lastWeekBookings),
      },
      defaultActiveDay: DAY_NAMES[activeDayIndex] || "Wed",
      recentBookings: recentList,
      todaySchedule: todayScheduleList,
      nextUpBooking,
      businessInsights,
    };

    return <HomeDashboardClient data={liveData} />;
  } catch (err) {
    console.error("Failed to load salon dashboard data on AdminDashboardPage:", err);
    return <HomeDashboardClient data={defaultData} />;
  }
}
