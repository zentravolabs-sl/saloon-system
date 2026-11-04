"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Calendar, CalendarDays, Building2, Users, Clock, CalendarOff, Scissors,
  FolderTree, UserCheck, Receipt, Tag, Star, BarChart3, Bell, Settings, LogOut, Plus, Menu,
  X, CreditCard, Gift, Lock, Wallet, Package, Truck, FileText, Banknote, Award, TrendingUp,
  ShoppingCart, ChevronDown, Megaphone, Landmark, UserCircle, HandCoins, PanelLeftClose,
  PanelLeftOpen, type LucideIcon,
} from "lucide-react";
import { SalonStatusProvider, useSalonStatus } from "@/context/SalonStatusContext";
import { I18nProvider, useT } from "@/context/I18nContext";
import { LOCALES, Locale, MessageKey } from "@/lib/i18n/messages";
import { SalonApprovalBanner } from "@/components/admin/SalonApprovalBanner";
import {
  IconName, NavEntry, NavLeaf, flattenNav, navFor, pathMatches, tabsFor,
} from "@/lib/rbac";

const ICONS: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard, plus: Plus, calendar: Calendar, calendarDays: CalendarDays,
  customers: UserCheck, staff: Users, clock: Clock, leave: CalendarOff, services: Scissors,
  category: FolderTree, branches: Building2, billing: HandCoins, payments: CreditCard,
  receipt: Receipt, pos: ShoppingCart, stock: Package, supplier: Truck, buyStock: FileText,
  finance: Landmark, expenses: Wallet, salary: Banknote, earnings: Award, reports: BarChart3,
  trend: TrendingUp, marketing: Megaphone, coupon: Tag, loyalty: Gift, review: Star, bell: Bell,
  settings: Settings, profile: UserCircle,
};

function SidebarNav({
  onNavigate,
  isCollapsed = false,
}: {
  onNavigate?: () => void;
  isCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useT();
  const entries = useMemo(() => navFor(session?.user?.role), [session?.user?.role]);

  // The most specific leaf wins, so "Staff List" is not highlighted on "Work Schedules"
  const activeHref = useMemo(() => {
    const matches = flattenNav(entries)
      .map((l) => l.href)
      .filter((h) => pathMatches(pathname, h))
      .sort((a, b) => b.length - a.length);
    return matches[0] ?? null;
  }, [entries, pathname]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const isOpen = (e: Extract<NavEntry, { type: "group" }>) =>
    openGroups[e.key] ?? e.children.some((c) => c.href === activeHref);

  // Floating flyout/tooltip for collapsed state
  const [flyoutState, setFlyoutState] = useState<{
    entry: NavEntry;
    top: number;
    left: number;
  } | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close flyout on scroll or navigation or mode change
  useEffect(() => {
    const handleScroll = () => {
      if (flyoutState) setFlyoutState(null);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [flyoutState]);

  useEffect(() => {
    setFlyoutState(null);
  }, [pathname, isCollapsed]);

  const handleMouseEnter = (entry: NavEntry, el: HTMLElement) => {
    if (!isCollapsed) return;
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    const rect = el.getBoundingClientRect();
    setFlyoutState({
      entry,
      top: rect.top,
      left: rect.right + 8,
    });
  };

  const handleMouseLeave = () => {
    if (!isCollapsed) return;
    closeTimeoutRef.current = setTimeout(() => {
      setFlyoutState(null);
    }, 150);
  };

  const handleFlyoutMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  };

  const handleFlyoutMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setFlyoutState(null);
    }, 150);
  };

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-3.5 min-h-11 rounded-xl text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A78BFA] ${
      active ? "bg-[#8B5CF6] text-white" : "text-[#D1D5DB] hover:text-white hover:bg-white/10"
    }`;

  const collapsedLinkClass = (active: boolean) =>
    `flex items-center justify-center w-11 h-11 mx-auto rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A78BFA] ${
      active
        ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30"
        : "text-[#D1D5DB] hover:text-white hover:bg-white/10"
    }`;

  return (
    <nav aria-label="Main" className="space-y-1 relative">
      {entries.map((entry) => {
        if (entry.type === "link") {
          const Icon = ICONS[entry.icon];
          const active = activeHref === entry.href;

          if (isCollapsed) {
            return (
              <div
                key={entry.key + entry.href}
                className="relative"
                onMouseEnter={(e) => handleMouseEnter(entry, e.currentTarget)}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  href={entry.href}
                  onClick={() => {
                    setFlyoutState(null);
                    onNavigate?.();
                  }}
                  aria-current={active ? "page" : undefined}
                  aria-label={t(entry.key as MessageKey)}
                  className={collapsedLinkClass(active)}
                >
                  <Icon className="w-5 h-5 shrink-0" aria-hidden />
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={entry.key + entry.href}
              href={entry.href}
              onClick={onNavigate}
              aria-current={activeHref === entry.href ? "page" : undefined}
              className={linkClass(active)}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden />
              <span>{t(entry.key as MessageKey)}</span>
            </Link>
          );
        }

        const Icon = ICONS[entry.icon];
        const open = isOpen(entry);
        const containsActive = entry.children.some((c) => c.href === activeHref);
        const panelId = `nav-group-${entry.key}`;

        if (isCollapsed) {
          return (
            <div
              key={entry.key}
              className="relative"
              onMouseEnter={(e) => handleMouseEnter(entry, e.currentTarget)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                aria-label={t(entry.key as MessageKey)}
                aria-expanded={flyoutState?.entry.key === entry.key}
                onClick={(e) => {
                  if (flyoutState?.entry.key === entry.key) {
                    setFlyoutState(null);
                  } else {
                    handleMouseEnter(entry, e.currentTarget);
                  }
                }}
                className={`${collapsedLinkClass(false)} ${
                  containsActive ? "text-white bg-white/10 ring-1 ring-[#8B5CF6]/50" : ""
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden />
              </button>
            </div>
          );
        }

        return (
          <div key={entry.key}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenGroups((s) => ({ ...s, [entry.key]: !open }))}
              className={`w-full ${linkClass(false)} justify-between ${
                containsActive ? "text-white bg-white/5" : ""
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className="w-5 h-5 shrink-0" aria-hidden />
                <span>{t(entry.key as MessageKey)}</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {open && (
              <div id={panelId} className="mt-1 ml-5 pl-3 border-l border-white/10 space-y-1">
                {entry.children.map((child) => {
                  const ChildIcon = ICONS[child.icon];
                  const active = activeHref === child.href;
                  return (
                    <Link
                      key={child.key + child.href}
                      href={child.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={linkClass(active)}
                    >
                      <ChildIcon className="w-4 h-4 shrink-0" aria-hidden />
                      <span>{t(child.key as MessageKey)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Collapsed flyout popup */}
      {isCollapsed && flyoutState && (
        <div
          role="tooltip"
          style={{ top: flyoutState.top, left: flyoutState.left }}
          onMouseEnter={handleFlyoutMouseEnter}
          onMouseLeave={handleFlyoutMouseLeave}
          className="fixed z-50 bg-[#121424] border border-white/10 rounded-xl shadow-2xl p-2 min-w-[200px]"
        >
          {flyoutState.entry.type === "link" ? (
            <div className="px-3 py-1.5 text-sm font-semibold text-white">
              {t(flyoutState.entry.key as MessageKey)}
            </div>
          ) : (
            <div>
              <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#A78BFA] border-b border-white/10 mb-1">
                {t(flyoutState.entry.key as MessageKey)}
              </div>
              <div className="space-y-0.5">
                {flyoutState.entry.children.map((child) => {
                  const ChildIcon = ICONS[child.icon];
                  const active = activeHref === child.href;
                  return (
                    <Link
                      key={child.key + child.href}
                      href={child.href}
                      onClick={() => {
                        setFlyoutState(null);
                        onNavigate?.();
                      }}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-[#8B5CF6] text-white"
                          : "text-[#D1D5DB] hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <ChildIcon className="w-4 h-4 shrink-0" aria-hidden />
                      <span>{t(child.key as MessageKey)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

function SectionTabs({ items }: { items: NavLeaf[] }) {
  const pathname = usePathname();
  const { t } = useT();
  const active = [...items]
    .filter((i) => pathMatches(pathname, i.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <div role="tablist" aria-label="Section" className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          role="tab"
          aria-selected={active === item.href}
          className={`shrink-0 px-4 min-h-11 inline-flex items-center rounded-xl text-sm font-semibold border transition-colors ${
            active === item.href
              ? "bg-[#8B5CF6] border-[#8B5CF6] text-white"
              : "bg-white/5 border-white/10 text-[#D1D5DB] hover:bg-white/10"
          }`}
        >
          {t(item.key as MessageKey)}
        </Link>
      ))}
    </div>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t, locale, setLocale } = useT();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isApproved, status, salon } = useSalonStatus();
  const role = session?.user?.role;
  const canCreateBooking = role === "SALON_OWNER" || role === "MANAGER" || role === "RECEPTIONIST";
  const tabs = tabsFor(role, pathname);

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

  const pageTitle = useMemo(() => {
    const best = flattenNav(navFor(role))
      .filter((l) => pathMatches(pathname, l.href))
      .sort((a, b) => b.href.length - a.href.length)[0];
    return best ? t(best.key as MessageKey) : t("nav.dashboard");
  }, [role, pathname, t]);

  // Close the drawer on navigation and on Escape
  useEffect(() => setMobileMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  const brand = (
    <Link href={role === "STAFF" ? "/admin/my-appointments" : "/admin/dashboard"} className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#8B5CF6] flex items-center justify-center text-white shrink-0">
        <Scissors className="w-5 h-5 -rotate-45" aria-hidden />
      </div>
      <div className="overflow-hidden">
        <h2 className="font-bold text-base text-white truncate">
          {salon?.name || session?.user?.salonName || "Salon"}
        </h2>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-[#C4B5FD] font-semibold">
            {role ? t(`role.${role}` as MessageKey) : ""}
          </span>
          {status && status !== "APPROVED" && (
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded font-bold uppercase ${
                status === "PENDING" ? "bg-amber-500/20 text-amber-200" : "bg-red-500/20 text-red-200"
              }`}
            >
              {status}
            </span>
          )}
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-[#0A0B14] text-white flex text-[15px]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded-lg"
      >
        {t("common.skipToContent")}
      </a>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-[var(--border)] bg-[#0C0E1A] shrink-0 sticky top-0 h-screen transition-[width] duration-200 ease-in-out ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        {isCollapsed ? (
          <div className="p-3 border-b border-[var(--border)] flex flex-col items-center gap-2">
            <Link
              href={role === "STAFF" ? "/admin/my-appointments" : "/admin/dashboard"}
              className="w-10 h-10 rounded-xl bg-[#8B5CF6] flex items-center justify-center text-white shrink-0 hover:bg-[#7C3AED] transition-colors"
              title={salon?.name || session?.user?.salonName || "Salon"}
              aria-label={salon?.name || session?.user?.salonName || "Salon"}
            >
              <Scissors className="w-5 h-5 -rotate-45" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#A78BFA]"
              title={t("nav.expandSidebar")}
              aria-label={t("nav.expandSidebar")}
            >
              <PanelLeftOpen className="w-5 h-5" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-2">
            <div className="min-w-0 overflow-hidden flex-1">{brand}</div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#A78BFA]"
              title={t("nav.collapseSidebar")}
              aria-label={t("nav.collapseSidebar")}
            >
              <PanelLeftClose className="w-5 h-5" aria-hidden />
            </button>
          </div>
        )}

        <div className={`flex-1 ${isCollapsed ? "p-2 overflow-y-auto" : "p-3 overflow-y-auto"} custom-scrollbar`}>
          <SidebarNav isCollapsed={isCollapsed} />
        </div>

        {isCollapsed ? (
          <div className="p-3 border-t border-[var(--border)] bg-black/20 flex flex-col items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0 cursor-default"
              title={`${session?.user?.name || "User"} (${session?.user?.email || ""})`}
              aria-label={session?.user?.name || "User"}
            >
              {(session?.user?.name?.[0] || "U").toUpperCase()}
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[#FCA5A5] hover:bg-white/10 transition-colors"
              title={t("common.signOut")}
              aria-label={t("common.signOut")}
            >
              <LogOut className="w-4 h-4" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="p-4 border-t border-[var(--border)] bg-black/20 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{session?.user?.name || ""}</p>
              <p className="text-xs text-[#9CA3AF] truncate">{session?.user?.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="shrink-0 inline-flex items-center gap-2 px-3 min-h-11 rounded-xl text-sm font-semibold text-[#FCA5A5] hover:bg-white/10"
              aria-label={t("common.signOut")}
            >
              <LogOut className="w-4 h-4" aria-hidden />
              <span>{t("common.signOut")}</span>
            </button>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="min-h-16 border-b border-[var(--border)] bg-[#0C0E1A] sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 px-3 min-h-11 rounded-xl bg-white/10 text-white font-semibold text-sm"
              aria-label={t("nav.menu")}
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-5 h-5" aria-hidden />
              <span className="hidden xs:inline sm:inline">{t("nav.menu")}</span>
            </button>
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden lg:inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#A78BFA]"
              title={isCollapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
              aria-label={isCollapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-5 h-5" aria-hidden />
              ) : (
                <PanelLeftClose className="w-5 h-5" aria-hidden />
              )}
            </button>
            <h1 className="text-lg font-bold text-white truncate">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canCreateBooking &&
              (isApproved ? (
                <Link
                  href="/admin/bookings/new"
                  className="inline-flex items-center gap-2 px-4 min-h-11 rounded-xl text-sm font-bold bg-[#8B5CF6] text-white hover:bg-[#7C3AED] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <Plus className="w-4 h-4" aria-hidden />
                  <span>{t("nav.newBooking")}</span>
                </Link>
              ) : (
                <button
                  disabled
                  title="Salon registration is pending Super Admin approval. Adding bookings is locked."
                  className="inline-flex items-center gap-2 px-3 min-h-11 rounded-xl text-sm font-semibold bg-white/5 text-amber-200 border border-amber-500/30 cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" aria-hidden />
                  <span>{t("common.pendingApproval")}</span>
                </button>
              ))}

            <label className="sr-only" htmlFor="lang-select">{t("common.language")}</label>
            <select
              id="lang-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="min-h-11 rounded-xl bg-white/10 border border-white/10 text-sm px-2 text-white"
            >
              {LOCALES.map((l) => (
                <option key={l.code} value={l.code} className="bg-[#0C0E1A]">{l.label}</option>
              ))}
            </select>

            <Link
              href="/admin/notifications"
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 hover:bg-white/15 text-white"
              aria-label={t("nav.notifications")}
            >
              <Bell className="w-5 h-5" aria-hidden />
            </Link>
          </div>
        </header>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={t("nav.menu")}>
            <div className="w-[85%] max-w-sm bg-[#0C0E1A] h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                {brand}
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-white hover:bg-white/10"
                  aria-label={t("nav.close")}
                >
                  <X className="w-6 h-6" aria-hidden />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
              </div>
              <div className="p-3 border-t border-white/10">
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className="w-full inline-flex items-center justify-center gap-2 min-h-12 rounded-xl text-base font-semibold text-[#FCA5A5] bg-white/5"
                >
                  <LogOut className="w-5 h-5" aria-hidden />
                  {t("common.signOut")}
                </button>
              </div>
            </div>
            <button
              className="flex-1 bg-black/70"
              onClick={() => setMobileMenuOpen(false)}
              aria-label={t("nav.close")}
            />
          </div>
        )}

        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <SalonApprovalBanner />
          {tabs && <SectionTabs items={tabs} />}
          {children}
        </main>
      </div>
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
