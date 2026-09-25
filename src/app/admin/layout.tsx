"use client";

import { useState } from "react";
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
  Plus,
  Menu,
  X,
  CreditCard,
  Gift,
  Lock,
} from "lucide-react";
import { SalonStatusProvider, useSalonStatus } from "@/context/SalonStatusContext";
import { SalonApprovalBanner } from "@/components/admin/SalonApprovalBanner";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isApproved, status, salon } = useSalonStatus();

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Bookings", href: "/admin/bookings", icon: Calendar },
    { name: "Calendar View", href: "/admin/calendar", icon: CalendarDays },
    { name: "Branches", href: "/admin/branches", icon: Building2 },
    { name: "Staff & Barbers", href: "/admin/staff", icon: Users },
    { name: "Staff Schedules", href: "/admin/staff/schedules", icon: Clock },
    { name: "Staff Leaves", href: "/admin/staff/leaves", icon: CalendarOff },
    { name: "Services", href: "/admin/services", icon: Scissors },
    { name: "Categories", href: "/admin/categories", icon: FolderTree },
    { name: "Customers CRM", href: "/admin/customers", icon: UserCheck },
    { name: "Payments", href: "/admin/payments", icon: CreditCard },
    { name: "Invoices", href: "/admin/invoices", icon: Receipt },
    { name: "Coupons", href: "/admin/coupons", icon: Tag },
    { name: "Loyalty Program", href: "/admin/loyalty", icon: Gift },
    { name: "Reviews", href: "/admin/reviews", icon: Star },
    { name: "Reports & Analytics", href: "/admin/reports", icon: BarChart3 },
    { name: "Notifications", href: "/admin/notifications", icon: Bell },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0A0B14] text-white flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-[var(--border)] bg-[#0C0E1A] shrink-0 sticky top-0 h-screen">
        {/* Salon Brand Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-white shadow-md shadow-[#8B5CF6]/30">
              <Scissors className="w-5 h-5 transform -rotate-45" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-bold text-sm text-white truncate">
                {salon?.name || session?.user?.salonName || "Salon Admin"}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-[#A78BFA] px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 font-semibold uppercase">
                  {session?.user?.role || "OWNER"}
                </span>
                {status && status !== "APPROVED" && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                      status === "PENDING"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {status}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20"
                    : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[var(--text-muted)]"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center text-xs font-bold text-[#A78BFA]">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {session?.user?.name || "Admin"}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-white/5 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-[var(--border)] bg-[#0C0E1A]/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-white/5 text-[var(--text-secondary)] hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Salon Workspace</span>
              <span className="text-xs text-white/20">/</span>
              <span className="text-xs font-bold text-white">
                {navigation.find((n) => n.href === pathname)?.name || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isApproved ? (
              <Link
                href="/admin/bookings?new=true"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Booking</span>
              </Link>
            ) : (
              <button
                disabled
                title="Salon registration is pending Super Admin approval. Adding bookings is locked."
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 text-amber-300/80 border border-amber-500/20 cursor-not-allowed flex items-center gap-1.5 opacity-80"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Pending Approval</span>
              </button>
            )}

            <Link
              href="/admin/notifications"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EC4899] animate-pulse"></span>
            </Link>

            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-block text-xs font-semibold text-[var(--text-muted)] hover:text-white transition-colors"
            >
              View Public Site ↗
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex">
            <div className="w-64 bg-[#0C0E1A] h-full flex flex-col p-4 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-bold text-sm text-white">Navigation</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                      pathname === item.href
                        ? "bg-[#8B5CF6] text-white"
                        : "text-[var(--text-secondary)] hover:text-white"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <SalonApprovalBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SalonStatusProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SalonStatusProvider>
  );
}
