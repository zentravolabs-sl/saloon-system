"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  Scissors,
  UserCheck,
  Play,
  RotateCcw,
  Plus,
  Loader2,
  ArrowRight,
  Sparkles,
  Lock,
} from "lucide-react";
import { useSalonStatus } from "@/context/SalonStatusContext";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

export default function AdminDashboardPage() {
  const { isApproved } = useSalonStatus();
  const [stats, setStats] = useState<any>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [bookingTrend, setBookingTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStats = () => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) {
          setStats(data.stats);
          setUpcomingBookings(data.upcomingBookings || []);
          setBookingTrend(data.bookingTrend || []);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleUpdateStatus = async (bookingId: string, status: string, reason?: string) => {
    setActionLoading(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });

      if (res.ok) {
        fetchStats();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update booking status");
      }
    } catch {
      alert("Error updating booking");
    } finally {
      setActionLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    CONFIRMED: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    CHECKED_IN: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    IN_PROGRESS: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    CANCELLED: "bg-red-500/10 text-red-300 border-red-500/20",
    REJECTED: "bg-red-500/10 text-red-300 border-red-500/20",
    NO_SHOW: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
        <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
        <span>Loading salon metrics and analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Salon Command Center
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Real-time appointment statuses, staff capacity, and daily performance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isApproved ? (
            <Link
              href="/admin/bookings?new=true"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manual Walk-in</span>
            </Link>
          ) : (
            <button
              disabled
              title="Salon registration is pending Super Admin approval. Manual booking is locked."
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 text-amber-300/80 border border-amber-500/20 cursor-not-allowed flex items-center gap-1.5 opacity-80"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Walk-in (Pending Approval)</span>
            </button>
          )}
          <Link
            href="/admin/calendar"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar View</span>
          </Link>
          <button
            onClick={fetchStats}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-white/10 transition-colors"
            title="Refresh"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
            Today's Bookings
          </span>
          <p className="text-2xl font-black text-white">{stats?.todaysBookings || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 space-y-1">
          <span className="text-[11px] text-amber-400 font-semibold uppercase">
            Pending Approval
          </span>
          <p className="text-2xl font-black text-amber-300">{stats?.pending || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/[0.03] border border-blue-500/20 space-y-1">
          <span className="text-[11px] text-blue-400 font-semibold uppercase">
            Confirmed
          </span>
          <p className="text-2xl font-black text-blue-300">{stats?.confirmed || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-500/[0.03] border border-cyan-500/20 space-y-1">
          <span className="text-[11px] text-cyan-400 font-semibold uppercase">
            In Progress
          </span>
          <p className="text-2xl font-black text-cyan-300">{stats?.inProgress || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20 space-y-1">
          <span className="text-[11px] text-emerald-400 font-semibold uppercase">
            Completed
          </span>
          <p className="text-2xl font-black text-emerald-300">{stats?.completed || 0}</p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#8B5CF6]/10 to-[#EC4899]/10 border border-[#8B5CF6]/30 space-y-1">
          <span className="text-[11px] text-[#A78BFA] font-semibold uppercase">
            Today's Revenue
          </span>
          <p className="text-2xl font-black text-white">
            LKR {(stats?.todayRevenue || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Staff Capacity & Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 7-Day Booking Trends */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#8B5CF6]" />
                Appointment Trends (Last 7 Days)
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Daily volume of confirmed & completed reservations
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bookingTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#bookingGrad)"
                  name="Appointments"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Staff Capacity Gauge */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#06B6D4]" />
              Stylist Capacity Today
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Real-time available vs active busy staff
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs font-medium text-white">Available Stylists</span>
              </div>
              <span className="text-lg font-bold text-emerald-400">
                {stats?.availableStaff || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                <span className="text-xs font-medium text-white">Busy with Customer</span>
              </div>
              <span className="text-lg font-bold text-cyan-400">
                {stats?.busyStaff || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="text-xs font-medium text-white">No-Shows / Cancelled</span>
              </div>
              <span className="text-lg font-bold text-red-400">
                {(stats?.noShow || 0) + (stats?.cancelled || 0)}
              </span>
            </div>
          </div>

          <Link
            href="/admin/staff/schedules"
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-center bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors block"
          >
            Manage Working Schedules →
          </Link>
        </div>
      </div>

      {/* Live Appointments Feed with 1-Click Status Controls */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#EC4899]" />
              Active & Upcoming Appointments
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Perform one-click status transitions (Confirm, Check-In, Start, Complete)
            </p>
          </div>
          <Link
            href="/admin/bookings"
            className="text-xs font-semibold text-[#A78BFA] hover:text-white transition-colors"
          >
            View All Bookings →
          </Link>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">
            No upcoming bookings found. Walk-ins can be registered via "+ New Booking".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="py-3 px-3">Reference / Customer</th>
                  <th className="py-3 px-3">Service</th>
                  <th className="py-3 px-3">Stylist</th>
                  <th className="py-3 px-3">Time</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {upcomingBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-[11px] text-[var(--text-muted)] block">
                        {b.reference}
                      </span>
                      <span className="font-bold text-white text-sm">
                        {b.customer?.name}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] block">
                        {b.customer?.phone}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-medium text-white">
                        {b.services?.map((s: any) => s.service?.name).join(", ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="text-white font-medium">{b.staff?.name}</span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-bold text-white block">{b.startTime}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {new Date(b.bookingDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          statusColors[b.status] || "bg-white/10 text-white"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      {actionLoading === b.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6] inline-block" />
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {b.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(b.id, "CONFIRMED")}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold border border-emerald-500/30 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt("Rejection reason:") || "Time slot unavailable";
                                  handleUpdateStatus(b.id, "REJECTED", reason);
                                }}
                                className="px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 font-semibold border border-red-500/30 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {b.status === "CONFIRMED" && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(b.id, "CHECKED_IN")}
                                className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-semibold border border-purple-500/30 transition-colors"
                              >
                                Check-In
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(b.id, "NO_SHOW")}
                                className="px-2 py-1 rounded-lg bg-zinc-500/15 hover:bg-zinc-500/25 text-zinc-300 font-semibold border border-zinc-500/30 transition-colors"
                              >
                                No-Show
                              </button>
                            </>
                          )}

                          {b.status === "CHECKED_IN" && (
                            <button
                              onClick={() => handleUpdateStatus(b.id, "IN_PROGRESS")}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-semibold border border-cyan-500/30 transition-colors flex items-center gap-1"
                            >
                              <Play className="w-3 h-3 fill-cyan-300" />
                              <span>Start</span>
                            </button>
                          )}

                          {b.status === "IN_PROGRESS" && (
                            <button
                              onClick={() => handleUpdateStatus(b.id, "COMPLETED")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm transition-colors"
                            >
                              Complete & Invoice
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
