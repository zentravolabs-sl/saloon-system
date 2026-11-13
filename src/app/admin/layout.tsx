"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Building2,
  Users,
  Clock,
  CalendarOff,
  Scissors,
  FolderTree,
  UserCheck,
  Receipt,
  Tag,
  Star,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  LogIn,
  Plus,
  Menu,
  X,
  CreditCard,
  Gift,
  Lock,
  Wallet,
  Package,
  Truck,
  FileText,
  Banknote,
  Award,
  TrendingUp,
  ShoppingCart,
  ChevronDown,
  Megaphone,
  Landmark,
  UserCircle,
  HandCoins,
  Home,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { SalonStatusProvider, useSalonStatus } from "@/context/SalonStatusContext";
import { I18nProvider, useT } from "@/context/I18nContext";
import { LOCALES, Locale, MessageKey } from "@/lib/i18n/messages";
import { SalonApprovalBanner } from "@/components/admin/SalonApprovalBanner";
import { NewBookingModal } from "@/components/admin/NewBookingModal";
import { PRASANTHA_AVATAR_IMG } from "@/components/public/homeAssets";
import { ADMIN_SIDEBAR_ITEMS } from "@/components/public/HomeDashboardClient";
import {
  IconName,
  NavLeaf,
  flattenNav,
  navFor,
  pathMatches,
  tabsFor,
} from "@/lib/rbac";

const ICONS: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  plus: Plus,
  calendar: Calendar,
  calendarDays: CalendarDays,
  customers: UserCheck,
  staff: Users,
  clock: Clock,
  leave: CalendarOff,
  services: Scissors,
  category: FolderTree,
  branches: Building2,
  billing: HandCoins,
  payments: CreditCard,
  receipt: Receipt,
  pos: ShoppingCart,
  stock: Package,
  supplier: Truck,
  buyStock: FileText,
  finance: Landmark,
  expenses: Wallet,
  salary: Banknote,
  earnings: Award,
  reports: BarChart3,
  trend: TrendingUp,
  marketing: Megaphone,
  coupon: Tag,
  loyalty: Gift,
  review: Star,
  bell: Bell,
  settings: Settings,
  profile: UserCircle,
};

const INVENTORY_SUB_ITEMS = [
  { label: "Products", href: "/admin/inventory" },
  { label: "Stock", href: "/admin/inventory/stock" },
  { label: "Low Stock", href: "/admin/inventory/low-stock" },
  { label: "History", href: "/admin/inventory/history" },
] as const;

function isInventorySubActive(pathname: string, href: string): boolean {
  if (href === "/admin/inventory") {
    return pathname === "/admin/inventory" || pathname === "/admin/inventory/products";
  }
  return pathname === href || pathname.startsWith(href + "/");
}

function isSidebarItemActive(
  pathname: string,
  item: (typeof ADMIN_SIDEBAR_ITEMS)[number]
): boolean {
  if (item.href === "/") {
    return pathname === "/";
  }
  if (item.matchPrefixes && item.matchPrefixes.length > 0) {
    return item.matchPrefixes.some((prefix) => pathMatches(pathname, prefix));
  }
  return pathMatches(pathname, item.href);
}

function SectionTabs({ items }: { items: NavLeaf[] }) {
  const pathname = usePathname();
  const { t } = useT();
  const active = [...items]
    .filter((i) => pathMatches(pathname, i.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <div
      role="tablist"
      aria-label="Section"
      className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1"
    >
      {items.map((item) => {
        const isSelected = active === item.href;
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            role="tab"
            aria-selected={isSelected}
            className={`shrink-0 px-4 min-h-10 inline-flex items-center gap-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
              isSelected
                ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] border-[#7C3AED] text-white shadow-[0_4px_12px_rgba(124,58,237,0.25)]"
                : "bg-white/90 border-white text-[#334155] hover:bg-white hover:text-[#6D28D9] shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
            }`}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden />}
            <span>{t(item.key as MessageKey)}</span>
          </Link>
        );
      })}
    </div>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t, locale, setLocale } = useT();
  const { isApproved, status, salon } = useSalonStatus();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newBookingModalOpen, setNewBookingModalOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const role = session?.user?.role;
  const isAuthenticated = !!session?.user;
  const canCreateBooking =
    role === "SALON_OWNER" || role === "MANAGER" || role === "RECEPTIONIST";
  const tabs = tabsFor(role, pathname);

  const userName = session?.user?.name || "Prasantha";
  const userEmail = session?.user?.email || null;
  const userAvatar = session?.user?.image || PRASANTHA_AVATAR_IMG;
  const salonName = salon?.name || session?.user?.salonName || "Glamour Cuts";
  const dashboardUrl =
    role === "SUPER_ADMIN" ? "/super-admin/dashboard" : "/admin/dashboard";

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_sidebar_collapsed");
      if (saved === "true") {
        setIsCollapsed(true);
      }
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => setMobileMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  const currentDateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date());
    } catch {
      return "Wed, Nov 5, 2026";
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sidebarItems = useMemo(() => {
    if (role === "STAFF") {
      return [
        {
          label: t("nav.myAppointments"),
          href: "/admin/my-appointments",
          matchPrefixes: ["/admin/my-appointments"],
          icon: Calendar,
        },
        {
          label: t("nav.mySchedule"),
          href: "/admin/my-schedule",
          matchPrefixes: ["/admin/my-schedule"],
          icon: Clock,
        },
        {
          label: t("nav.myCommissions"),
          href: "/admin/my-commissions",
          matchPrefixes: ["/admin/my-commissions"],
          icon: Award,
        },
        {
          label: t("nav.myProfile"),
          href: "/admin/my-profile",
          matchPrefixes: ["/admin/my-profile"],
          icon: UserCircle,
        },
      ];
    }
    return ADMIN_SIDEBAR_ITEMS;
  }, [role, t]);

  return (
    <div
      className="min-h-screen w-full text-[#0F172A] flex selection:bg-violet-500/20"
      style={{
        background:
          "radial-gradient(circle at 10% 10%, #F5F3FF 0%, #EEF0F9 45%, #E9ECF8 100%)",
      }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-[#0F172A] focus:px-4 focus:py-2 focus:rounded-lg"
      >
        {t("common.skipToContent")}
      </a>

      {/* ================================================================== */}
      {/* DESKTOP COLLAPSIBLE SIDEBAR (Matches HomeDashboardClient)          */}
      {/* ================================================================== */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 sticky top-0 h-screen bg-white/85 backdrop-blur-xl border-r border-white/80 shadow-[4px_0_24px_rgba(15,23,42,0.04)] z-40 transition-[width] duration-200 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand + Collapse Toggle */}
        {isCollapsed ? (
          <div className="p-3.5 border-b border-[#EEF2F6] flex flex-col items-center gap-2.5">
            <Link
              href="/"
              className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-[#A855F7] via-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white shadow-[0_6px_16px_rgba(124,58,237,0.32)] shrink-0 relative overflow-hidden"
              title="Zentravo SaaS"
            >
              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/15 rounded-t-[14px]" />
              <Scissors className="w-5 h-5 -rotate-90 relative z-10" strokeWidth={2.2} />
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-[#475569] hover:text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="p-5 border-b border-[#EEF2F6] flex items-center justify-between gap-2">
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-[13px] bg-gradient-to-br from-[#A855F7] via-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white shadow-[0_6px_16px_rgba(124,58,237,0.32)] shrink-0 relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1/2 bg-white/15 rounded-t-[13px]" />
                <Scissors className="w-5 h-5 -rotate-90 relative z-10" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[19px] font-extrabold text-[#0F172A] tracking-tight leading-none">
                    Zentravo
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5B21B6] text-white leading-none">
                    SaaS
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <p className="text-[11px] font-medium text-[#64748B] leading-none truncate">
                    {salonName}
                  </p>
                  {status && status !== "APPROVED" && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase leading-none ${
                        status === "PENDING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {status}
                    </span>
                  )}
                </div>
              </div>
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl text-[#475569] hover:text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors cursor-pointer"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav
          aria-label="Sidebar Navigation"
          className={`flex-1 overflow-y-auto ${
            isCollapsed ? "p-3" : "p-4"
          } space-y-1.5 no-scrollbar`}
        >
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const href =
              item.href === "/admin/dashboard" ? dashboardUrl : item.href;
            const active = isSidebarItemActive(pathname, item);

            if (isCollapsed) {
              return (
                <Link
                  key={item.label}
                  href={href}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-center w-11 h-11 mx-auto rounded-xl transition-all ${
                    active
                      ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_6px_16px_rgba(124,58,237,0.28)]"
                      : "text-[#475569] hover:text-[#6D28D9] hover:bg-[#F5F3FF]"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" strokeWidth={2.1} />
                </Link>
              );
            }

            return (
              <div key={item.label} className="space-y-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-bold transition-all ${
                    active
                      ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_6px_16px_rgba(124,58,237,0.26)]"
                      : "text-[#334155] hover:text-[#6D28D9] hover:bg-[#F5F3FF]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                  <span className="truncate">{item.label}</span>
                </Link>
                {item.href === "/admin/inventory" && (
                  <div className="ml-4 pl-3 border-l-2 border-[#E2E8F0] space-y-0.5">
                    {INVENTORY_SUB_ITEMS.map((sub) => {
                      const subActive = isInventorySubActive(pathname, sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`block px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            subActive
                              ? "bg-[#F5F3FF] text-[#6D28D9] font-bold"
                              : "text-[#64748B] hover:text-[#6D28D9] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer User Profile */}
        {isCollapsed ? (
          <div className="p-3 border-t border-[#EEF2F6] flex flex-col items-center gap-2">
            <img
              src={userAvatar}
              alt={userName}
              title={`${userName} (${salonName})`}
              className="w-9 h-9 rounded-full object-cover border border-[#E2E8F0] shadow-xs"
            />
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-[#EF4444] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors"
                title="Sign In"
                aria-label="Sign In"
              >
                <LogIn className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="p-3.5 border-t border-[#EEF2F6] flex items-center justify-between gap-2 bg-[#F8FAFC]/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={userAvatar}
                alt={userName}
                className="w-9 h-9 rounded-full object-cover border border-white shadow-xs shrink-0"
              />
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-extrabold text-[#0F172A] truncate">
                  {userName}
                </p>
                <p className="text-[11px] font-medium text-[#64748B] truncate">
                  {salonName}
                </p>
              </div>
            </div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl text-[#EF4444] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors"
                title="Sign In"
                aria-label="Sign In"
              >
                <LogIn className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </aside>

      {/* ================================================================== */}
      {/* MOBILE SIDEBAR DRAWER                                              */}
      {/* ================================================================== */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
        >
          <div className="w-[82%] max-w-xs bg-white h-full flex flex-col shadow-2xl border-r border-[#E2E8F0]">
            <div className="p-4 border-b border-[#EEF2F6] flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="w-10 h-10 rounded-[13px] bg-gradient-to-br from-[#A855F7] via-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white shadow-md shrink-0">
                  <Scissors className="w-5 h-5 -rotate-90" strokeWidth={2.2} />
                </div>
                <div>
                  <span className="text-lg font-extrabold text-[#0F172A] block leading-none">
                    Zentravo
                  </span>
                  <span className="text-[11px] font-medium text-[#64748B]">
                    {salonName}
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#475569] hover:bg-[#F1F5F9]"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const href =
                  item.href === "/admin/dashboard" ? dashboardUrl : item.href;
                const active = isSidebarItemActive(pathname, item);
                return (
                  <div key={item.label} className="space-y-1">
                    <Link
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        active
                          ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-md"
                          : "text-[#334155] hover:text-[#6D28D9] hover:bg-[#F5F3FF]"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                    {item.href === "/admin/inventory" && (
                      <div className="ml-4 pl-3 border-l-2 border-[#E2E8F0] space-y-0.5">
                        {INVENTORY_SUB_ITEMS.map((sub) => {
                          const subActive = isInventorySubActive(pathname, sub.href);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`block px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                subActive
                                  ? "bg-[#F5F3FF] text-[#6D28D9] font-bold"
                                  : "text-[#64748B] hover:text-[#6D28D9] hover:bg-[#F8FAFC]"
                              }`}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
          <button
            type="button"
            className="flex-1 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu overlay"
          />
        </div>
      )}

      {/* ================================================================== */}
      {/* MAIN CONTENT WRAPPER                                               */}
      {/* ================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER BAR */}
        <header className="w-full py-4 sm:py-5 px-5 sm:px-7 lg:px-10 border-b border-white/60 bg-white/30 backdrop-blur-md sticky top-0 z-30">
          <div className="w-full flex items-center justify-between gap-4">
            {/* Left: Sidebar Toggle + Zentravo SaaS Brand */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white/95 border border-white shadow-[0_4px_18px_rgba(15,23,42,0.04)] text-[#0F172A] hover:text-[#6D28D9] transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden lg:inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white/95 hover:bg-white border border-white shadow-[0_4px_18px_rgba(15,23,42,0.04)] text-[#0F172A] hover:text-[#6D28D9] transition-colors cursor-pointer"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-5 h-5" />
                ) : (
                  <PanelLeftClose className="w-5 h-5" />
                )}
              </button>

              <Link href="/admin/dashboard" className="flex items-center gap-3 shrink-0">
                <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-[#A855F7] via-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white shadow-[0_6px_16px_rgba(124,58,237,0.32)] shrink-0 relative overflow-hidden lg:hidden">
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-white/15 rounded-t-[14px]" />
                  <Scissors className="w-5 h-5 -rotate-90 relative z-10" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[20px] sm:text-[22px] font-extrabold text-[#0F172A] tracking-tight leading-none">
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
            </div>

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

            {/* Right: Actions + Date Pill + Notification Bell + Logged-in User */}
            <div className="flex items-center gap-3 sm:gap-3.5 shrink-0">
              {canCreateBooking &&
                (isApproved ? (
                  <button
                    type="button"
                    onClick={() => setNewBookingModalOpen(true)}
                    className="hidden xl:inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_6px_16px_rgba(124,58,237,0.28)] hover:brightness-105 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" aria-hidden />
                    <span>{t("nav.newBooking")}</span>
                  </button>
                ) : (
                  <button
                    disabled
                    title="Salon registration is pending Super Admin approval. Adding bookings is locked."
                    className="hidden xl:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] cursor-not-allowed"
                  >
                    <Lock className="w-3.5 h-3.5" aria-hidden />
                    <span>{t("common.pendingApproval")}</span>
                  </button>
                ))}

              <label className="sr-only" htmlFor="lang-select">
                {t("common.language")}
              </label>
              <select
                id="lang-select"
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className="hidden lg:inline-block h-10 rounded-2xl bg-white/95 border border-white shadow-[0_4px_18px_rgba(15,23,42,0.04)] text-xs font-bold px-3 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-violet-500/20 cursor-pointer"
              >
                {LOCALES.map((l) => (
                  <option
                    key={l.code}
                    value={l.code}
                    className="bg-white text-[#0F172A]"
                  >
                    {l.label}
                  </option>
                ))}
              </select>

              {/* Date Pill */}
              <div className="hidden sm:inline-flex items-center gap-2.5 bg-white/95 border border-white rounded-2xl px-4 py-2.5 shadow-[0_4px_18px_rgba(15,23,42,0.04)] text-[13px] font-bold text-[#0F172A]">
                <Calendar className="w-4 h-4 text-[#0F172A]" strokeWidth={2.2} />
                <span>{currentDateLabel}</span>
              </div>

              {/* Notification Bell */}
              <Link
                href="/admin/notifications"
                className="relative w-11 h-11 rounded-2xl bg-white/95 hover:bg-white border border-white shadow-[0_4px_18px_rgba(15,23,42,0.04)] flex items-center justify-center text-[#0F172A] transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" strokeWidth={2.2} />
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
                    alt={userName}
                    className="w-10 h-10 rounded-full object-cover border border-white shadow-xs shrink-0"
                  />
                  <div className="hidden xs:block sm:block text-left leading-tight">
                    <p className="text-[14px] font-extrabold text-[#0F172A]">
                      {userName}
                    </p>
                    <p className="text-[11.5px] font-medium text-[#475569]">
                      {salonName}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#0F172A] ml-0.5" strokeWidth={2.3} />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_12px_32px_rgba(15,23,42,0.12)] py-2 z-50">
                    <div className="px-4 py-2 border-b border-[#F1F5F9]">
                      <p className="text-xs font-extrabold text-[#0F172A] truncate">
                        {userName}
                      </p>
                      <p className="text-[11px] font-medium text-[#64748B] truncate">
                        {userEmail || salonName}
                      </p>
                    </div>

                    <Link
                      href="/"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] hover:text-[#6D28D9] transition-colors"
                    >
                      <Home className="w-4 h-4" />
                      <span>Home Overview</span>
                    </Link>

                    <Link
                      href={dashboardUrl}
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] hover:text-[#6D28D9] transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Admin Dashboard</span>
                    </Link>

                    {isAuthenticated ? (
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/auth/login" })}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    ) : (
                      <Link
                        href="/auth/login"
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

        <main
          id="main-content"
          className="flex-1 w-full px-5 sm:px-7 lg:px-10 py-6 sm:py-8"
        >
          <SalonApprovalBanner />
          {tabs && <SectionTabs items={tabs} />}
          {children}
        </main>

        <footer className="w-full border-t border-white/80 bg-white/70 backdrop-blur-md px-5 sm:px-7 lg:px-10 py-5 text-center text-xs font-medium text-[#64748B]">
          <p>© 2026 Zentravo SaaS Platform. All rights reserved.</p>
        </footer>
      </div>

      <NewBookingModal
        open={newBookingModalOpen}
        onClose={() => setNewBookingModalOpen(false)}
      />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <SalonStatusProvider>
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </SalonStatusProvider>
    </I18nProvider>
  );
}
