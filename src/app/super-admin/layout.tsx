"use client";

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
  Scissors,
  Sparkles,
} from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

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

  return (
    <div className="min-h-screen bg-[#0A0B14] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#0C0E1A] shrink-0 sticky top-0 h-screen flex flex-col">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link href="/super-admin/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-sm text-white block">Zentravo</span>
              <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 uppercase">
                Super Admin
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md"
                    : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">{session?.user?.name || "Admin"}</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">{session?.user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main View */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-white/10 bg-[#0C0E1A]/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)]">Platform Governance</span>
            <span className="text-white/20">/</span>
            <span className="text-white font-bold">
              {navigation.find((n) => n.href === pathname)?.name || "Super Admin"}
            </span>
          </div>

          <Link
            href="/"
            target="_blank"
            className="text-xs font-semibold text-[var(--text-muted)] hover:text-white transition-colors"
          >
            View Public Portal ↗
          </Link>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
