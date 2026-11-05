"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
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
  Search,
  Bell,
  LogOut,
  LogIn,
  LayoutDashboard,
} from "lucide-react";
import {
  HERO_SALON_IMG,
  PRASANTHA_AVATAR_IMG,
  AVATAR_1_IMG,
  AVATAR_2_IMG,
  AVATAR_3_IMG,
  AVATAR_4_IMG,
  CARD_BOOKINGS_IMG,
  CARD_CUSTOMERS_IMG,
  CARD_SERVICES_IMG,
  CARD_STAFF_IMG,
  CARD_INVENTORY_IMG,
  CARD_SALES_IMG,
  CARD_REPORTS_IMG,
  CARD_SETTINGS_IMG,
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

export interface HomeDashboardData {
  isAuthenticated: boolean;
  userName: string;
  userEmail: string | null;
  userRole: string | null;
  userImage: string | null;
  salonName: string;
  currency: string;
  currentDateLabel: string;
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

const MODULE_CARDS = [
  {
    title: "Bookings",
    desc: "Create, view and manage appointments",
    href: "/admin/bookings",
    icon: Calendar,
    iconRotate: false,
    bg: "linear-gradient(180deg, #823AF5 0%, #7D33E8 50%, #5E25CC 100%)",
    shadow: "shadow-[0_10px_24px_rgba(109,40,217,0.26)]",
    art: CARD_BOOKINGS_IMG,
  },
  {
    title: "Customers",
    desc: "Manage customer profiles and history",
    href: "/admin/customers",
    icon: Users,
    iconRotate: false,
    bg: "linear-gradient(180deg, #197CF1 0%, #1472E3 50%, #0B68E9 100%)",
    shadow: "shadow-[0_10px_24px_rgba(20,114,227,0.26)]",
    art: CARD_CUSTOMERS_IMG,
  },
  {
    title: "Services",
    desc: "Salon & spa services, pricing and duration",
    href: "/admin/services",
    icon: Scissors,
    iconRotate: true,
    bg: "linear-gradient(180deg, #EF54B0 0%, #CF308A 55%, #D72587 100%)",
    shadow: "shadow-[0_10px_24px_rgba(215,37,135,0.26)]",
    art: CARD_SERVICES_IMG,
  },
  {
    title: "Staff / Stylists",
    desc: "Manage stylists, schedules and commissions",
    href: "/admin/staff",
    icon: Users,
    iconRotate: false,
    bg: "linear-gradient(180deg, #FEA93C 0%, #EC892B 50%, #EE7D1F 100%)",
    shadow: "shadow-[0_10px_24px_rgba(238,125,31,0.26)]",
    art: CARD_STAFF_IMG,
  },
  {
    title: "Inventory",
    desc: "Track products and stock levels",
    href: "/admin/inventory",
    icon: Box,
    iconRotate: false,
    bg: "linear-gradient(180deg, #12B775 0%, #159268 55%, #0DA25E 100%)",
    shadow: "shadow-[0_10px_24px_rgba(18,183,117,0.26)]",
    art: CARD_INVENTORY_IMG,
  },
  {
    title: "Sales & Payments",
    desc: "Bills, payments and daily sales",
    href: "/admin/pos",
    icon: CreditCard,
    iconRotate: false,
    bg: "linear-gradient(180deg, #0192C1 0%, #098DBD 50%, #017DB1 100%)",
    shadow: "shadow-[0_10px_24px_rgba(1,146,193,0.26)]",
    art: CARD_SALES_IMG,
  },
  {
    title: "Reports",
    desc: "Business reports and performance insights",
    href: "/admin/reports",
    icon: BarChart3,
    iconRotate: false,
    bg: "linear-gradient(180deg, #E6AE1D 0%, #E2A018 50%, #DB8E04 100%)",
    shadow: "shadow-[0_10px_24px_rgba(219,142,4,0.26)]",
    art: CARD_REPORTS_IMG,
  },
  {
    title: "Settings",
    desc: "System, branches and customization",
    href: "/admin/settings",
    icon: Settings,
    iconRotate: false,
    bg: "linear-gradient(180deg, #7832EC 0%, #6D2DDB 50%, #5E28C8 100%)",
    shadow: "shadow-[0_10px_24px_rgba(109,45,219,0.26)]",
    art: CARD_SETTINGS_IMG,
  },
];

export function HomeDashboardClient({ data }: { data: HomeDashboardData }) {
  const [summaryRange, setSummaryRange] = useState<"Today" | "Yesterday" | "This Week">("Today");
  const [overviewRange, setOverviewRange] = useState<"This Week" | "Last Week">("This Week");
  const [activeDay, setActiveDay] = useState<string>(data.defaultActiveDay || "Wed");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const firstName = data.userName.split(" ")[0] || "Prasantha";
  const userAvatar = data.userImage || PRASANTHA_AVATAR_IMG;
  const dashboardUrl =
    data.userRole === "SUPER_ADMIN"
      ? "/super-admin/dashboard"
      : "/admin/dashboard";

  const summary = data.summary[summaryRange];
  const chartData = data.weeklyOverview[overviewRange];
  const maxBarValue = Math.max(50, ...chartData.map((d) => d.count));

  const filteredRecentBookings = searchQuery.trim()
    ? data.recentBookings.filter(
        (b) =>
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.service.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data.recentBookings;

  return (
    <div
      className="min-h-screen w-full text-[#0F172A] selection:bg-violet-500/20"
      style={{
        background:
          "radial-gradient(circle at 10% 10%, #F5F3FF 0%, #EEF0F9 45%, #E9ECF8 100%)",
      }}
    >
      {/* ================================================================== */}
      {/* TOP HEADER BAR                                                     */}
      {/* ================================================================== */}
      <header className="w-full pt-4 pb-2 px-4 sm:px-6 lg:px-8 border-b border-white/60">
        <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-4">
          {/* Left: Zentravo SaaS Brand */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-[#A855F7] via-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white shadow-[0_6px_16px_rgba(124,58,237,0.32)] shrink-0 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/15 rounded-t-[14px]" />
              <Scissors className="w-5 h-5 -rotate-90 relative z-10" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-extrabold text-[#0F172A] tracking-tight leading-none">
                  Zentravo
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#5B21B6] text-white leading-none">
                  SaaS
                </span>
              </div>
              <p className="text-[12px] font-medium text-[#475569] mt-1 leading-none">
                Salon &amp; Barber Cloud
              </p>
            </div>
          </Link>

          {/* Center: Search Bar */}
          <div className="hidden md:flex items-center gap-2.5 bg-white/95 border border-white rounded-full px-4 py-2.5 shadow-[0_4px_18px_rgba(15,23,42,0.04)] w-full max-w-[390px] lg:max-w-[430px]">
            <Search className="w-4 h-4 text-[#1E1B4B] shrink-0" strokeWidth={2.4} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookings, customers, services..."
              className="w-full bg-transparent text-[13px] font-medium text-[#0F172A] placeholder:text-[#64748B] focus:outline-none"
            />
          </div>

          {/* Right: Date Pill + Notification Bell + Logged-in User */}
          <div className="flex items-center gap-3 sm:gap-3.5 shrink-0">
            {/* Date Pill */}
            <div className="hidden sm:inline-flex items-center gap-2.5 bg-white/95 border border-white rounded-2xl px-4 py-2.5 shadow-[0_4px_18px_rgba(15,23,42,0.04)] text-[13px] font-bold text-[#0F172A]">
              <Calendar className="w-4 h-4 text-[#0F172A]" strokeWidth={2.2} />
              <span>{data.currentDateLabel}</span>
            </div>

            {/* Notification Bell with Badge */}
            <Link
              href="/admin/notifications"
              className="relative w-11 h-11 rounded-2xl bg-white/95 hover:bg-white border border-white shadow-[0_4px_18px_rgba(15,23,42,0.04)] flex items-center justify-center text-[#0F172A] transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" strokeWidth={2.2} />
              {data.notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                  {data.notificationCount}
                </span>
              )}
            </Link>

            {/* Logged-in User Profile + Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-full hover:bg-white/60 transition-colors cursor-pointer"
              >
                <img
                  src={userAvatar}
                  alt={data.userName}
                  className="w-10 h-10 rounded-full object-cover border border-white shadow-xs shrink-0"
                />
                <div className="hidden xs:block sm:block text-left leading-tight">
                  <p className="text-[14px] font-extrabold text-[#0F172A]">
                    {data.userName}
                  </p>
                  <p className="text-[11.5px] font-medium text-[#475569]">
                    {data.salonName}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-[#0F172A] ml-0.5" strokeWidth={2.3} />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_12px_32px_rgba(15,23,42,0.12)] py-2 z-50">
                  <div className="px-4 py-2 border-b border-[#F1F5F9]">
                    <p className="text-xs font-extrabold text-[#0F172A] truncate">
                      {data.userName}
                    </p>
                    <p className="text-[11px] font-medium text-[#64748B] truncate">
                      {data.userEmail || data.salonName}
                    </p>
                  </div>

                  <Link
                    href={dashboardUrl}
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] hover:text-[#6D28D9] transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Admin Dashboard</span>
                  </Link>

                  {data.isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/auth/login?callbackUrl=/" })}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <Link
                      href="/auth/login?callbackUrl=/"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Sign In to Salon</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-4 sm:space-y-5">
        {/* ================================================================ */}
        {/* 1. HERO WELCOME BANNER                                           */}
        {/* ================================================================ */}
        <section
          className="relative overflow-hidden rounded-[24px] border border-white/90 shadow-[0_10px_32px_rgba(91,33,182,0.06)]"
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
                  Good Morning,
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
        {/* 3. 8 MODULE NAVIGATION CARDS (2 ROWS x 4 COLUMNS)                */}
        {/* ================================================================ */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {MODULE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className={`group relative overflow-hidden rounded-[20px] p-5 min-h-[138px] flex flex-col justify-between text-white ${card.shadow} hover:-translate-y-0.5 transition-all duration-200`}
                style={{ background: card.bg }}
              >
                <div className="relative z-10 max-w-[60%]">
                  <Icon
                    className={`w-7 h-7 text-white mb-2 ${
                      card.iconRotate ? "-rotate-45" : ""
                    }`}
                    strokeWidth={2}
                  />
                  <h2 className="text-[19px] font-extrabold tracking-tight leading-snug">
                    {card.title}
                  </h2>
                  <p className="text-[12px] text-white/90 font-medium leading-snug mt-1">
                    {card.desc}
                  </p>
                </div>

                <img
                  src={card.art}
                  alt={card.title}
                  className="absolute right-0 top-0 h-full w-auto object-cover object-right select-none pointer-events-none group-hover:scale-[1.03] transition-transform duration-200"
                  style={{
                    WebkitMaskImage:
                      "linear-gradient(to right, transparent 0%, black 14%, black 100%)",
                    maskImage:
                      "linear-gradient(to right, transparent 0%, black 14%, black 100%)",
                  }}
                />
              </Link>
            );
          })}
        </section>

        {/* ================================================================ */}
        {/* 4. BOTTOM 3 ANALYTICS & SUMMARY CARDS                            */}
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
              {filteredRecentBookings.map((b, idx) => (
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
      </main>
    </div>
  );
}

