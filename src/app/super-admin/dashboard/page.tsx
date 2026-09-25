"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  Clock,
  Users,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [pendingSalons, setPendingSalons] = useState<any[]>([]);
  const [recentSalons, setRecentSalons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchGlobalData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/super-admin/stats").then((res) => res.json()),
      fetch("/api/super-admin/salons?status=PENDING").then((res) => res.json()),
      fetch("/api/super-admin/salons?limit=5").then((res) => res.json()),
    ])
      .then(([statsData, pendingData, allData]) => {
        if (statsData.stats) setStats(statsData.stats);
        if (pendingData.salons) setPendingSalons(pendingData.salons);
        if (allData.salons) setRecentSalons(allData.salons);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const handleUpdateStatus = async (salonId: string, status: string, reason?: string) => {
    setActionLoading(salonId);
    try {
      const res = await fetch(`/api/super-admin/salons/${salonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason: reason }),
      });

      if (res.ok) {
        fetchGlobalData();
      } else {
        alert("Failed to update salon status");
      }
    } catch {
      alert("Error updating salon");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        <span>Loading SaaS platform metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Multi-Tenant Platform Governance
        </h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Global tenant statistics, salon registration reviews, and revenue analytics.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
            Total Salons
          </span>
          <p className="text-2xl font-black text-white">{stats?.totalSalons || 0}</p>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20 space-y-1">
          <span className="text-[11px] text-emerald-400 font-semibold uppercase">
            Active Salons
          </span>
          <p className="text-2xl font-black text-emerald-300">{stats?.activeSalons || 0}</p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 space-y-1">
          <span className="text-[11px] text-amber-400 font-semibold uppercase">
            Pending Approval
          </span>
          <p className="text-2xl font-black text-amber-300">{stats?.pendingSalons || 0}</p>
        </div>

        <div className="p-5 rounded-2xl bg-red-500/[0.03] border border-red-500/20 space-y-1">
          <span className="text-[11px] text-red-400 font-semibold uppercase">
            Suspended
          </span>
          <p className="text-2xl font-black text-red-300">{stats?.suspendedSalons || 0}</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-tr from-amber-500/10 to-rose-500/10 border border-amber-500/30 space-y-1">
          <span className="text-[11px] text-amber-300 font-semibold uppercase">
            Platform Revenue
          </span>
          <p className="text-2xl font-black text-white">
            LKR {(stats?.platformRevenue || 0).toLocaleString()}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
            Total Branches
          </span>
          <p className="text-2xl font-black text-white">{stats?.totalBranches || 0}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
            Total Stylists
          </span>
          <p className="text-2xl font-black text-white">{stats?.totalStaff || 0}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
            Total Clients
          </span>
          <p className="text-2xl font-black text-white">{stats?.totalCustomers || 0}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
            Today's Bookings
          </span>
          <p className="text-2xl font-black text-white">{stats?.todaysBookings || 0}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
            Monthly Bookings
          </span>
          <p className="text-2xl font-black text-white">{stats?.monthlyBookings || 0}</p>
        </div>
      </div>

      {/* Pending Approvals Queue */}
      {pendingSalons.length > 0 && (
        <div className="p-6 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                Pending Salon Registrations ({pendingSalons.length})
              </h2>
            </div>
            <Link
              href="/super-admin/salons/pending"
              className="text-xs font-semibold text-amber-400 hover:text-white"
            >
              View All Queue →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingSalons.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-bold text-sm text-white">{s.name}</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Owner: {s.owner?.name} • {s.city}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Phone: {s.phone || s.owner?.phone}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={actionLoading === s.id}
                    onClick={() => handleUpdateStatus(s.id, "APPROVED")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30"
                  >
                    Approve
                  </button>
                  <button
                    disabled={actionLoading === s.id}
                    onClick={() => {
                      const reason = prompt("Rejection reason:") || "Incomplete documentation";
                      handleUpdateStatus(s.id, "REJECTED", reason);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/30"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salons Management Overview */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            Registered Salons & SaaS Tenants
          </h2>
          <Link
            href="/super-admin/salons"
            className="text-xs font-semibold text-amber-400 hover:text-white"
          >
            Manage All Salons →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.01] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Salon</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Branches</th>
                <th className="py-3 px-4">Staff</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentSalons.map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">{s.name}</td>
                  <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                    {s.owner?.name}
                  </td>
                  <td className="py-3.5 px-4 text-[var(--text-muted)]">{s.city}</td>
                  <td className="py-3.5 px-4 font-semibold text-white">
                    {s._count?.branches || 0}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-white">
                    {s._count?.staff || 0}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        s.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : s.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {s.status === "APPROVED" && (
                      <button
                        onClick={() => handleUpdateStatus(s.id, "SUSPENDED")}
                        className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 font-semibold text-[11px]"
                      >
                        Suspend
                      </button>
                    )}
                    {s.status === "SUSPENDED" && (
                      <button
                        onClick={() => handleUpdateStatus(s.id, "APPROVED")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-semibold text-[11px]"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
