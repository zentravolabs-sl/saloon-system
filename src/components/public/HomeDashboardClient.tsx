"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  Wallet,
  Scissors,
  Box,
  CreditCard,
  BarChart3,
  Settings,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  Home,
  LayoutDashboard,
  CalendarDays,
  Building2,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import {
  HERO_SALON_IMG,
  AVATAR_1_IMG,
  AVATAR_2_IMG,
  AVATAR_3_IMG,
  AVATAR_4_IMG,
} from "@/components/public/homeAssets";

export interface SummaryCounts {
  completed: number;
  inProgress: number;
  upcoming: number;
  cancelled: number;
}

export interface DayBookingStat {
  day: string;
  count: number;
}

export interface RecentBookingItem {
  id: string;
  name: string;
  service: string;
  time: string;
  status: string;
  statusStyle: string;
  avatarIndex: number;
}

export interface TodayScheduleItem {
  id: string;
  startTime: string;
  timeLabel: string;
  hourSlot: number;
  customerName: string;
  service: string;
  staffName?: string;
  status: string;
  statusStyle: string;
}

export interface NextUpBooking {
  id: string;
  customerName: string;
  initials: string;
  service: string;
  timeLabel: string;
}

export interface PopularServiceItem {
  name: string;
  count: number;
}

export interface BusinessInsightsData {
  monthlyRevenueFormatted?: string;
  estimatedProfitFormatted?: string;
  avgTicketFormatted?: string;
  completionRatePct?: number;
  topServiceName: string;
  topServiceBookings: number;
  topStylistName?: string;
  topStylistCompleted?: number;
  topStylistRevenueFormatted?: string;
  activeStaffCount?: number;
  newCustomersThisMonth?: number;
  lowStockCount?: number;
  pendingApprovalsCount?: number;
  popularServices?: PopularServiceItem[];
  peakDayName?: string;
  peakDayHigherPct?: number;
}

export interface HomeDashboardData {
  isAuthenticated: boolean;
  userName: string;
  userEmail: string | null;
  userRole: string | null;
  userImage: string | null;
  salonName: string;
  currency: string;
  currentDateLabel: string;
  greeting?: string;
  notificationCount: number;
  kpis: {
    todayBookings: number;
    bookingsGrowthLabel: string;
    totalCustomers: number;
    customersGrowthLabel: string;
    todayRevenueFormatted: string;
    revenueGrowthLabel: string;
    activeServices: number;
    servicesStatusLabel: string;
  };
  summary: {
    Today: SummaryCounts;
    Yesterday: SummaryCounts;
    "This Week": SummaryCounts;
  };
  weeklyOverview: {
    "This Week": DayBookingStat[];
    "Last Week": DayBookingStat[];
  };
  defaultActiveDay: string;
  recentBookings: RecentBookingItem[];
  todaySchedule?: TodayScheduleItem[];
  nextUpBooking?: NextUpBooking | null;
  businessInsights?: BusinessInsightsData;
}

/* -------------------------------------------------------------------------- */
/*                              SPARKLINE COMPONENT                           */
/* -------------------------------------------------------------------------- */

function Sparkline({
  color,
  gradId,
  path,
  areaPath,
}: {
  color: string;
  gradId: string;
  path: string;
  areaPath: string;
}) {
  return (
    <svg
      viewBox="0 0 110 46"
      className="w-[96px] sm:w-[108px] h-[42px] pointer-events-none overflow-visible"
      fill="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={path}
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const AVATARS = [AVATAR_1_IMG, AVATAR_2_IMG, AVATAR_3_IMG, AVATAR_4_IMG];

export const ADMIN_SIDEBAR_ITEMS: {
  label: string;
  href: string;
  matchPrefixes?: string[];
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    matchPrefixes: ["/admin/dashboard"],
    icon: LayoutDashboard,
  },
  {
    label: "Bookings",
    href: "/admin/bookings",
    matchPrefixes: ["/admin/bookings"],
    icon: Calendar,
  },
  {
    label: "Calendar",
    href: "/admin/calendar",
    matchPrefixes: ["/admin/calendar"],
    icon: CalendarDays,
  },
  {
    label: "Customers",
    href: "/admin/customers",
    matchPrefixes: [
      "/admin/customers",
      "/admin/loyalty",
      "/admin/coupons",
      "/admin/reviews",
    ],
    icon: Users,
  },
  {
    label: "Services",
    href: "/admin/services",
    matchPrefixes: ["/admin/services", "/admin/categories"],
    icon: Scissors,
  },
  {
    label: "Staff / Stylists",
    href: "/admin/staff",
    matchPrefixes: ["/admin/staff", "/admin/commissions"],
    icon: Users,
  },
  {
    label: "Inventory",
    href: "/admin/inventory",
    matchPrefixes: ["/admin/inventory"],
    icon: Box,
  },
  {
    label: "Sales & Payments",
    href: "/admin/pos",
    matchPrefixes: [
      "/admin/pos",
      "/admin/billing",
      "/admin/payments",
      "/admin/invoices",
    ],
    icon: CreditCard,
  },
  {
    label: "Reports",
    href: "/admin/reports",
    matchPrefixes: ["/admin/reports", "/admin/expenses", "/admin/payroll"],
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    matchPrefixes: ["/admin/settings"],
    icon: Settings,
  },
];

function getTimeBasedGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function HomeDashboardClient({ data }: { data: HomeDashboardData }) {
  const [summaryRange, setSummaryRange] = useState<"Today" | "Yesterday" | "This Week">("Today");
  const [overviewRange, setOverviewRange] = useState<"This Week" | "Last Week">("This Week");
  const [activeDay, setActiveDay] = useState<string>(data.defaultActiveDay || "Wed");
  const [greeting, setGreeting] = useState<string>(
    data.greeting || getTimeBasedGreeting()
  );

  useEffect(() => {
    const syncGreeting = () => setGreeting(getTimeBasedGreeting());
    syncGreeting();
    const timer = setInterval(syncGreeting, 60_000);
    return () => clearInterval(timer);
  }, []);

  const firstName = data.userName.split(" ")[0] || "Prasantha";
  const summary = data.summary[summaryRange];
  const chartData = data.weeklyOverview[overviewRange];
  const maxBarValue = Math.max(50, ...chartData.map((d) => d.count));

  const defaultPopularServices: PopularServiceItem[] = [
    { name: "Hair Cut", count: 12 },
    { name: "Hair Styling", count: 8 },
    { name: "Beard Styling", count: 6 },
    { name: "Facial", count: 4 },
  ];

  const insights: BusinessInsightsData = data.businessInsights ?? {
    topServiceName: "Hair Cut",
    topServiceBookings: 12,
    popularServices: defaultPopularServices,
    peakDayName: "Friday",
    peakDayHigherPct: 32,
  };

  const popularServices =
    insights.popularServices && insights.popularServices.length > 0
      ? insights.popularServices
      : defaultPopularServices;
  const maxServiceCount = Math.max(
    1,
    ...popularServices.map((s) => s.count)
  );
  const mostPopularServiceName =
    popularServices[0]?.name || insights.topServiceName || "Hair Cut";
  const peakDayName = insights.peakDayName || "Friday";
  const peakDayHigherPct =
    insights.peakDayHigherPct !== undefined && insights.peakDayHigherPct > 0
      ? insights.peakDayHigherPct
      : 32;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ================================================================ */}
      {/* 1. HERO WELCOME BANNER                                           */}
      {/* ================================================================ */}
      <section
        className="relative overflow-hidden rounded-[24px] border border-white/95 shadow-[0_16px_38px_-6px_rgba(91,33,182,0.18),0_6px_16px_-4px_rgba(15,23,42,0.08)]"
        style={{
          background:
            "linear-gradient(90deg, #F1F0FE 0%, #E9E6FD 40%, #E5E6FB 52%, #E5E6FB 100%)",
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between min-h-[136px] sm:min-h-[146px]">
          {/* Left greeting text */}
          <div className="flex items-center gap-4 px-5 sm:px-7 py-5 md:py-4 z-20 md:max-w-[48%]">
            <div className="w-[5px] h-16 sm:h-[74px] rounded-full bg-gradient-to-b from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6] shrink-0" />
            <div>
              <p className="text-lg sm:text-[21px] font-bold text-[#5B21B6] leading-tight">
                {greeting},
              </p>
              <h1 className="text-3xl sm:text-[37px] font-extrabold text-[#5B21B6] tracking-tight leading-[1.1] mt-0.5 flex items-center gap-2">
                <span>{firstName}!</span>
                <span className="inline-block">👋</span>
              </h1>
              <p className="text-xs sm:text-[14px] font-medium text-[#334155] mt-1.5">
                Here&apos;s what&apos;s happening at {data.salonName} today.
              </p>
            </div>
          </div>

          {/* Right salon interior artwork */}
          <div className="relative w-full md:w-[58%] h-[130px] sm:h-[146px] md:absolute md:right-0 md:top-0 md:bottom-0 md:h-full overflow-hidden select-none pointer-events-none">
            <img
              src={HERO_SALON_IMG}
              alt={`${data.salonName} Salon Interior`}
              className="w-full h-full object-cover object-right"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 8%, black 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 8%, black 100%)",
              }}
            />
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 2. TOP 4 KPI STAT CARDS (Populated from Logged-in Salon Data)    */}
      {/* ================================================================ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Today's Bookings */}
        <div className="relative bg-white/95 backdrop-blur-md rounded-[22px] px-4 sm:px-5 py-4 border border-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] flex items-center min-h-[108px]">
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-[52px] h-[52px] rounded-[16px] bg-gradient-to-br from-[#A855F7] via-[#7C3AED] to-[#6366F1] flex items-center justify-center text-white shadow-[0_8px_18px_rgba(124,58,237,0.35)] shrink-0 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/15 rounded-t-[16px]" />
              <Calendar className="w-6 h-6 relative z-10" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#0F172A] whitespace-nowrap">
                Today&apos;s Bookings
              </p>
              <p className="text-[26px] font-extrabold text-[#0F172A] leading-tight tracking-tight mt-0.5">
                {data.kpis.todayBookings.toLocaleString("en-US")}
              </p>
              <span className="inline-flex items-center gap-0.5 mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                {data.kpis.bookingsGrowthLabel}
              </span>
            </div>
          </div>
          <div className="absolute right-3.5 bottom-2.5">
            <Sparkline
              color="#7C3AED"
              gradId="sparkPurple"
              path="M4 38 Q 18 37, 28 28 T 54 25 T 82 15 T 106 21"
              areaPath="M4 38 Q 18 37, 28 28 T 54 25 T 82 15 T 106 21 L 106 44 L 4 44 Z"
            />
          </div>
        </div>

        {/* KPI 2: Total Customers */}
        <div className="relative bg-white/95 backdrop-blur-md rounded-[22px] px-4 sm:px-5 py-4 border border-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] flex items-center min-h-[108px]">
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-[52px] h-[52px] rounded-[16px] bg-gradient-to-br from-[#34D399] via-[#10B981] to-[#059669] flex items-center justify-center text-white shadow-[0_8px_18px_rgba(16,185,129,0.35)] shrink-0 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/15 rounded-t-[16px]" />
              <Users className="w-6 h-6 relative z-10" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#0F172A] whitespace-nowrap">
                Total Customers
              </p>
              <p className="text-[26px] font-extrabold text-[#0F172A] leading-tight tracking-tight mt-0.5">
                {data.kpis.totalCustomers.toLocaleString("en-US")}
              </p>
              <span className="inline-flex items-center gap-0.5 mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                {data.kpis.customersGrowthLabel}
              </span>
            </div>
          </div>
          <div className="absolute right-3.5 bottom-2.5">
            <Sparkline
              color="#10B981"
              gradId="sparkGreen"
              path="M4 38 Q 20 36, 32 27 T 60 28 T 85 15 T 106 21"
              areaPath="M4 38 Q 20 36, 32 27 T 60 28 T 85 15 T 106 21 L 106 44 L 4 44 Z"
            />
          </div>
        </div>

        {/* KPI 3: Today's Revenue */}
        <div className="relative bg-white/95 backdrop-blur-md rounded-[22px] px-4 sm:px-5 py-4 border border-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] flex items-center min-h-[108px]">
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-[52px] h-[52px] rounded-[16px] bg-gradient-to-br from-[#38BDF8] via-[#0284C7] to-[#2563EB] flex items-center justify-center text-white shadow-[0_8px_18px_rgba(2,132,199,0.35)] shrink-0 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/15 rounded-t-[16px]" />
              <Wallet className="w-6 h-6 relative z-10" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#0F172A] whitespace-nowrap">
                Today&apos;s Revenue
              </p>
              <p className="text-[22px] font-extrabold text-[#0F172A] leading-tight tracking-tight whitespace-nowrap mt-0.5">
                {data.kpis.todayRevenueFormatted}
              </p>
              <span className="inline-flex items-center gap-0.5 mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                {data.kpis.revenueGrowthLabel}
              </span>
            </div>
          </div>
          <div className="absolute right-3.5 bottom-2.5">
            <Sparkline
              color="#0EA5E9"
              gradId="sparkBlue"
              path="M4 38 Q 22 37, 36 29 T 64 26 T 88 15 T 106 20"
              areaPath="M4 38 Q 22 37, 36 29 T 64 26 T 88 15 T 106 20 L 106 44 L 4 44 Z"
            />
          </div>
        </div>

        {/* KPI 4: Active Services */}
        <div className="relative bg-white/95 backdrop-blur-md rounded-[22px] px-4 sm:px-5 py-4 border border-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] flex items-center min-h-[108px]">
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-[52px] h-[52px] rounded-[16px] bg-gradient-to-br from-[#FBBF24] via-[#F59E0B] to-[#EA580C] flex items-center justify-center text-white shadow-[0_8px_18px_rgba(245,158,11,0.35)] shrink-0 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/15 rounded-t-[16px]" />
              <Scissors className="w-6 h-6 -rotate-45 relative z-10" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#0F172A] whitespace-nowrap">
                Active Services
              </p>
              <p className="text-[26px] font-extrabold text-[#0F172A] leading-tight tracking-tight mt-0.5">
                {data.kpis.activeServices.toLocaleString("en-US")}
              </p>
              <span className="inline-flex items-center gap-0.5 mt-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                {data.kpis.servicesStatusLabel}
              </span>
            </div>
          </div>
          <div className="absolute right-3.5 bottom-2.5">
            <Sparkline
              color="#D97706"
              gradId="sparkOrange"
              path="M4 38 Q 18 36, 30 27 T 58 26 T 84 14 T 106 20"
              areaPath="M4 38 Q 18 36, 30 27 T 58 26 T 84 14 T 106 20 L 106 44 L 4 44 Z"
            />
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 3. 3 ANALYTICS & SUMMARY CARDS                                   */}
      {/* ================================================================ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* -------------------------------------------------------------- */}
        {/* Widget 1: Today's Summary (4 columns)                          */}
        {/* -------------------------------------------------------------- */}
        <div className="lg:col-span-4 bg-white/95 backdrop-blur-md rounded-[22px] p-5 border border-white shadow-[0_8px_28px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-end gap-[3px] h-5">
                <span className="w-1 h-2.5 rounded-full bg-[#A855F7]" />
                <span className="w-1 h-4 rounded-full bg-[#7C3AED]" />
                <span className="w-1 h-5 rounded-full bg-[#6D28D9]" />
              </div>
              <h3 className="text-[16.5px] font-extrabold text-[#0F172A] tracking-tight">
                Today&apos;s Summary
              </h3>
            </div>

            <div className="relative">
              <select
                aria-label="Summary time range"
                value={summaryRange}
                onChange={(e) => setSummaryRange(e.target.value as any)}
                className="appearance-none bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-full pl-3.5 pr-8 py-1 text-xs font-semibold text-[#334155] cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="bg-[#F8FAFC]/90 rounded-[18px] border border-[#EEF2F6] py-6 px-2 grid grid-cols-4 divide-x divide-[#E2E8F0] my-auto">
            {/* Completed */}
            <div className="flex flex-col items-center text-center px-1">
              <div className="w-9 h-9 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#10B981] mb-2.5">
                <CheckCircle2 className="w-5 h-5" strokeWidth={2.4} />
              </div>
              <span className="text-2xl sm:text-[25px] font-extrabold text-[#0F172A] leading-none">
                {summary.completed}
              </span>
              <span className="text-[11px] font-medium text-[#475569] mt-2">
                Completed
              </span>
            </div>

            {/* In Progress */}
            <div className="flex flex-col items-center text-center px-1">
              <div className="w-9 h-9 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#0284C7] mb-2.5">
                <Clock className="w-5 h-5" strokeWidth={2.4} />
              </div>
              <span className="text-2xl sm:text-[25px] font-extrabold text-[#0F172A] leading-none">
                {summary.inProgress}
              </span>
              <span className="text-[11px] font-medium text-[#475569] mt-2">
                In Progress
              </span>
            </div>

            {/* Upcoming */}
            <div className="flex flex-col items-center text-center px-1">
              <div className="w-9 h-9 rounded-full bg-[#FEF3C7] flex items-center justify-center text-[#D97706] mb-2.5">
                <Calendar className="w-5 h-5" strokeWidth={2.3} />
              </div>
              <span className="text-2xl sm:text-[25px] font-extrabold text-[#0F172A] leading-none">
                {summary.upcoming}
              </span>
              <span className="text-[11px] font-medium text-[#475569] mt-2">
                Upcoming
              </span>
            </div>

            {/* Cancelled */}
            <div className="flex flex-col items-center text-center px-1">
              <div className="w-9 h-9 rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#EF4444] mb-2.5">
                <XCircle className="w-5 h-5" strokeWidth={2.4} />
              </div>
              <span className="text-2xl sm:text-[25px] font-extrabold text-[#0F172A] leading-none">
                {summary.cancelled}
              </span>
              <span className="text-[11px] font-medium text-[#475569] mt-2">
                Cancelled
              </span>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Widget 2: Bookings Overview Bar Chart (4 columns)              */}
        {/* -------------------------------------------------------------- */}
        <div className="lg:col-span-4 bg-white/95 backdrop-blur-md rounded-[22px] p-5 border border-white shadow-[0_8px_28px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-end gap-[3px] h-5">
                <span className="w-1 h-2.5 rounded-full bg-[#A855F7]" />
                <span className="w-1 h-4 rounded-full bg-[#7C3AED]" />
                <span className="w-1 h-5 rounded-full bg-[#6D28D9]" />
              </div>
              <h3 className="text-[16.5px] font-extrabold text-[#0F172A] tracking-tight">
                Bookings Overview
              </h3>
            </div>

            <div className="relative">
              <select
                aria-label="Bookings overview range"
                value={overviewRange}
                onChange={(e) => setOverviewRange(e.target.value as any)}
                className="appearance-none bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-full pl-3.5 pr-8 py-1 text-xs font-semibold text-[#334155] cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="This Week">This Week</option>
                <option value="Last Week">Last Week</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Chart container */}
          <div className="relative pt-6 pb-1 flex-1 flex flex-col justify-end">
            <div className="flex items-end gap-3 h-[150px]">
              {/* Y-Axis Labels */}
              <div className="flex flex-col justify-between h-full text-[11px] font-semibold text-[#64748B] pr-1 pb-6 select-none">
                <span>{maxBarValue}</span>
                <span>{Math.round(maxBarValue * 0.8)}</span>
                <span>{Math.round(maxBarValue * 0.6)}</span>
                <span>{Math.round(maxBarValue * 0.4)}</span>
                <span>{Math.round(maxBarValue * 0.2)}</span>
                <span>0</span>
              </div>

              {/* Grid + Bars */}
              <div className="relative flex-1 h-full flex flex-col justify-end">
                <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3, 4, 5].map((line) => (
                    <div
                      key={line}
                      className="w-full border-b border-[#F1F5F9]"
                    />
                  ))}
                </div>

                {/* Bars row */}
                <div className="relative z-10 grid grid-cols-7 gap-2 sm:gap-3 items-end h-[calc(100%-24px)] px-1">
                  {chartData.map((item) => {
                    const isSelected = activeDay === item.day;
                    const heightPct = Math.max(
                      6,
                      Math.min(100, Math.round((item.count / maxBarValue) * 100))
                    );
                    return (
                      <div
                        key={item.day}
                        onMouseEnter={() => setActiveDay(item.day)}
                        onClick={() => setActiveDay(item.day)}
                        className="relative flex flex-col items-center justify-end h-full cursor-pointer group"
                      >
                        {isSelected && (
                          <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] text-white text-[11px] font-bold px-3 py-1 rounded-lg shadow-[0_6px_16px_rgba(109,40,217,0.35)]">
                            {item.count} Bookings
                            <span className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#6D28D9]" />
                          </div>
                        )}

                        <div
                          className={`w-full max-w-[30px] rounded-t-[8px] transition-all duration-300 ${
                            isSelected
                              ? "bg-gradient-to-b from-[#9333EA] via-[#7C3AED] to-[#5B21B6] shadow-[0_6px_16px_rgba(124,58,237,0.35)]"
                              : "bg-gradient-to-b from-[#DDD6FE] to-[#C4B5FD] hover:from-[#C4B5FD] hover:to-[#A78BFA]"
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis Day Labels */}
                <div className="grid grid-cols-7 gap-2 sm:gap-3 pt-2 px-1 text-center">
                  {chartData.map((item) => {
                    const isSelected = activeDay === item.day;
                    return (
                      <button
                        type="button"
                        key={item.day}
                        onClick={() => setActiveDay(item.day)}
                        className={`text-[11.5px] transition-colors ${
                          isSelected
                            ? "font-extrabold text-[#0F172A]"
                            : "font-medium text-[#64748B]"
                        }`}
                      >
                        {item.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Widget 3: Recent Bookings (4 columns)                          */}
        {/* -------------------------------------------------------------- */}
        <div className="lg:col-span-4 bg-white/95 backdrop-blur-md rounded-[22px] p-5 border border-white shadow-[0_8px_28px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#7C3AED]" strokeWidth={2.3} />
              <h3 className="text-[16.5px] font-extrabold text-[#0F172A] tracking-tight">
                Recent Bookings
              </h3>
            </div>

            <Link
              href="/admin/bookings"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {data.recentBookings.map((b, idx) => (
              <div
                key={b.id || idx}
                className="py-2.5 first:pt-1 last:pb-0 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={AVATARS[b.avatarIndex % AVATARS.length]}
                    alt={b.name}
                    className="w-9 h-9 rounded-full object-cover border border-[#E2E8F0] shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#0F172A] whitespace-nowrap leading-snug">
                      {b.name}
                    </p>
                    <p className="text-[11px] font-medium text-[#64748B] truncate max-w-[150px] leading-snug">
                      {b.service}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-[#475569] whitespace-nowrap">
                    <Clock className="w-3 h-3 text-[#64748B] shrink-0" />
                    <span>{b.time}</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold min-w-[72px] text-center ${b.statusStyle}`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 4. BOTTOM 2 CARDS: POPULAR SERVICES & BUSINESS INSIGHTS          */}
      {/* ================================================================ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Popular Services */}
        <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-5 border border-white shadow-[0_8px_28px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] flex items-center justify-center text-[#6D28D9]">
                <Scissors className="w-4 h-4" strokeWidth={2.3} />
              </div>
              <h3 className="text-[16.5px] font-extrabold text-[#0F172A] tracking-tight">
                Popular Services
              </h3>
            </div>
            <Link
              href="/admin/services"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
          </div>

          <div className="space-y-3.5 my-auto">
            {popularServices.slice(0, 4).map((srv, idx) => {
              const barPct = Math.max(
                14,
                Math.min(100, Math.round((srv.count / maxServiceCount) * 100))
              );
              const barColors = [
                "from-[#7C3AED] to-[#6D28D9]",
                "from-[#8B5CF6] to-[#7C3AED]",
                "from-[#A78BFA] to-[#8B5CF6]",
                "from-[#C4B5FD] to-[#A78BFA]",
              ];
              return (
                <div
                  key={srv.name}
                  className="grid grid-cols-12 items-center gap-3"
                >
                  <span className="col-span-4 sm:col-span-4 text-[13.5px] font-bold text-[#0F172A] truncate">
                    {srv.name}
                  </span>
                  <div className="col-span-6 sm:col-span-7 h-3 rounded-full bg-[#F1F5F9] overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${
                        barColors[idx % barColors.length]
                      } transition-all duration-500`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className="col-span-2 sm:col-span-1 text-right text-[13.5px] font-extrabold text-[#0F172A]">
                    {srv.count}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-3.5 mt-4 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
            <span className="font-semibold text-[#64748B]">
              Most popular:{" "}
              <strong className="font-extrabold text-[#6D28D9]">
                {mostPopularServiceName}
              </strong>
            </span>
          </div>
        </div>

        {/* Card 2: Business Insights */}
        <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-5 border border-white shadow-[0_8px_28px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
                <Sparkles className="w-4 h-4" strokeWidth={2.3} />
              </div>
              <h3 className="text-[16.5px] font-extrabold text-[#0F172A] tracking-tight">
                Business Insights
              </h3>
            </div>
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </Link>
          </div>

          <div className="space-y-3 my-auto">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#EEF2F6]">
              <span className="text-lg leading-none select-none mt-0.5">💡</span>
              <p className="text-[13.5px] font-semibold text-[#334155] leading-relaxed">
                <strong className="font-extrabold text-[#0F172A]">
                  {mostPopularServiceName}
                </strong>{" "}
                is your most booked service this week.
              </p>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#EEF2F6]">
              <span className="text-lg leading-none select-none mt-0.5">💡</span>
              <p className="text-[13.5px] font-semibold text-[#334155] leading-relaxed">
                <strong className="font-extrabold text-[#0F172A]">
                  {peakDayName}
                </strong>{" "}
                bookings are{" "}
                <strong className="font-extrabold text-[#15803D]">
                  {peakDayHigherPct}% higher
                </strong>{" "}
                than your weekly average.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
