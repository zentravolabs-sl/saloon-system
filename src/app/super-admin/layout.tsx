"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ShieldCheck,
  Building2,
  Clock,
  Users,
  CreditCard,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Home,
  Scissors,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("superadmin_sidebar_collapsed");
      if (saved === "true") {
        setIsCollapsed(true);
      }
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("superadmin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => setMobileMenuOpen(false), [pathname]);

  const navigation = [
    { name: "Global Overview", href: "/super-admin/dashboard", icon: ShieldCheck },
    { name: "All Salons", href: "/super-admin/salons", icon: Building2 },
    { name: "Pending Approvals", href: "/super-admin/salons/pending", icon: Clock },
    { name: "System Users", href: "/super-admin/users", icon: Users },
    { name: "Subscriptions", href: "/super-admin/subscriptions", icon: CreditCard },
    { name: "Platform Payments", href: "/super-admin/payments", icon: DollarSign },
    { name: "Platform Reports", href: "/super-admin/reports", icon: BarChart3 },
    { name: "Platform Settings", href: "/super-admin/settings", icon: Settings },
  ];

  const activeTitle =
    navigation.find((n) => n.href === pathname)?.name || "Super Admin";

  return (
    <div
      className="min-h-screen w-full text-[#0F172A] flex selection:bg-violet-500/20"
      style={{
        background:
          "radial-gradient(circle at 10% 10%, #F5F3FF 0%, #EEF0F9 45%, #E9ECF8 100%)",
      }}
    >
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 sticky top-0 h-screen bg-white/85 backdrop-blur-xl border-r border-white/80 shadow-[4px_0_24px_rgba(15,23,42,0.04)] z-40 transition-[width] duration-200 ease-in-out ${
          isCollapsed ? "w-20" : "w-68"
        }`}
      >
        {isCollapsed ? (
          <div className="p-3 border-b border-[#EEF2F6] flex flex-col items-center gap-2">
            <Link
              href="/super-admin/dashboard"
              className="w-10 h-10 rounded-[13px] bg-gradient-to-br from-[#A855F7] via-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white shadow-[0_6px_16px_rgba(124,58,237,0.32)] shrink-0 relative overflow-hidden"
              title="Zentravo Super Admin"
            >
              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/15 rounded-t-[13px]" />
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
          <div className="p-4 border-b border-[#EEF2F6] flex items-center justify-between gap-2">
            <Link href="/super-admin/dashboard" className="flex items-center gap-3 min-w-0">
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
                    Super Admin
                  </span>
                </div>
                <p className="text-[11px] font-medium text-[#64748B] mt-1 leading-none truncate">
                  Platform Governance
                </p>
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

        <nav
          className={`flex-1 ${
            isCollapsed ? "p-2" : "p-3"
          } space-y-1 overflow-y-auto no-scrollbar`}
        >
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                aria-label={item.name}
                className={`flex items-center ${
                  isCollapsed
                    ? "justify-center w-11 h-11 mx-auto"
                    : "gap-3 px-3.5 py-2.5"
                } rounded-xl text-[13.5px] font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_6px_16px_rgba(124,58,237,0.28)]"
                    : "text-[#334155] hover:text-[#6D28D9] hover:bg-[#F5F3FF]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {isCollapsed ? (
          <div className="p-3 border-t border-[#EEF2F6] flex flex-col items-center gap-2">
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#A855F7] to-[#6D28D9] flex items-center justify-center font-bold text-white text-xs shrink-0 cursor-default"
              title={`${session?.user?.name || "Super Admin"} (${
                session?.user?.email || ""
              })`}
            >
              {(session?.user?.name?.[0] || "A").toUpperCase()}
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-[#EF4444] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-3.5 border-t border-[#EEF2F6] bg-[#F8FAFC]/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A855F7] to-[#6D28D9] flex items-center justify-center font-bold text-white text-xs shrink-0">
                {(session?.user?.name?.[0] || "A").toUpperCase()}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-extrabold text-[#0F172A] truncate">
                  {session?.user?.name || "Super Admin"}
                </p>
                <p className="text-[10px] font-medium text-[#64748B] truncate">
                  {session?.user?.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl text-[#EF4444] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Super Admin Menu"
        >
          <div className="w-[82%] max-w-xs bg-white h-full flex flex-col shadow-2xl border-r border-[#E2E8F0]">
            <div className="p-4 border-b border-[#EEF2F6] flex items-center justify-between">
              <span className="text-lg font-extrabold text-[#0F172A]">
                Zentravo Super Admin
              </span>
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
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-md"
                        : "text-[#334155] hover:text-[#6D28D9] hover:bg-[#F5F3FF]"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="w-full py-3 px-3 sm:px-4 lg:px-5 border-b border-white/60 bg-white/40 backdrop-blur-md sticky top-0 z-30">
          <div className="w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white/95 border border-white shadow-[0_4px_18px_rgba(15,23,42,0.04)] text-[#0F172A]"
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

              <h1 className="text-base sm:text-lg font-extrabold text-[#0F172A] truncate">
                {activeTitle}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 border border-white shadow-[0_4px_18px_rgba(15,23,42,0.04)] text-xs font-bold text-[#0F172A] hover:text-[#6D28D9] transition-colors"
              >
                <Home className="w-4 h-4 text-[#7C3AED]" />
                <span className="hidden sm:inline">Home Portal</span>
              </Link>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/95 hover:bg-[#FEE2E2] border border-white text-[#B91C1C] shadow-[0_4px_18px_rgba(15,23,42,0.04)] text-xs font-bold transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full px-3 sm:px-4 lg:px-5 py-4">
          {children}
        </main>
      </div>
    </div>
  );
}
