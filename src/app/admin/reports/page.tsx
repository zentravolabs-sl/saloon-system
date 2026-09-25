"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  Scissors,
  Loader2,
  Download,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const TABS = [
  { id: "bookings", label: "Booking Reports", icon: Calendar },
  { id: "revenue", label: "Revenue Reports", icon: DollarSign },
  { id: "staff", label: "Staff Performance", icon: Users },
  { id: "services", label: "Service Reports", icon: Scissors },
];

const COLORS = ["#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1c2e] border border-white/10 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-[var(--text-muted)] mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-semibold">
          {entry.name}: {typeof entry.value === "number" && entry.name.toLowerCase().includes("revenue")
            ? `LKR ${entry.value.toLocaleString()}`
            : entry.value}
        </p>
      ))}
    </div>
  );
};

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState("bookings");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchReport = async (tab = activeTab) => {
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`/api/reports?type=${tab}&from=${dateFrom}&to=${dateTo}`);
      const d = await res.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [activeTab, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Analytics & Reports</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">In-depth visibility into bookings, revenue, staff, and services.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B5CF6]/50"
          />
          <span className="text-[var(--text-muted)] text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B5CF6]/50"
          />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20"
                : "bg-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10 border border-white/5"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
        </div>
      ) : !data ? null : (
        <>
          {/* Bookings Report */}
          {activeTab === "bookings" && data.summary && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Bookings", value: data.summary.total, color: "text-purple-400 bg-purple-400/10" },
                  { label: "Completed", value: data.summary.completed, color: "text-green-400 bg-green-400/10" },
                  { label: "Cancelled", value: data.summary.cancelled, color: "text-red-400 bg-red-400/10" },
                  { label: "No Shows", value: data.summary.noShow, color: "text-orange-400 bg-orange-400/10" },
                ].map((s) => (
                  <div key={s.label} className="card p-5">
                    <p className="text-xs text-[var(--text-muted)] font-medium mb-1">{s.label}</p>
                    <p className={`text-2xl font-black ${s.color.split(" ")[0]}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Daily Bookings Chart */}
              <div className="card p-6">
                <h3 className="text-sm font-bold text-white mb-5">Daily Booking Trends</h3>
                {data.daily?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={data.daily} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="total" stroke="#8B5CF6" fill="url(#totalGrad)" name="Total" strokeWidth={2} />
                      <Area type="monotone" dataKey="completed" stroke="#10B981" fill="url(#completedGrad)" name="Completed" strokeWidth={2} />
                      <Area type="monotone" dataKey="cancelled" stroke="#EF4444" fill="none" name="Cancelled" strokeWidth={1.5} strokeDasharray="4 4" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-12 text-center text-sm text-[var(--text-muted)]">No booking data in selected period</div>
                )}
              </div>

              {/* Status Breakdown */}
              {data.summary && (
                <div className="card p-6">
                  <h3 className="text-sm font-bold text-white mb-5">Status Breakdown</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Completed", value: data.summary.completed },
                          { name: "Pending", value: data.summary.pending },
                          { name: "Confirmed", value: data.summary.confirmed },
                          { name: "Cancelled", value: data.summary.cancelled },
                          { name: "No Show", value: data.summary.noShow },
                        ].filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {COLORS.map((color, i) => <Cell key={i} fill={color} />)}
                      </Pie>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Revenue Report */}
          {activeTab === "revenue" && data.daily && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-5">
                  <p className="text-xs text-[var(--text-muted)] font-medium mb-1">Total Revenue</p>
                  <p className="text-2xl font-black text-green-400">LKR {data.totalRevenue?.toLocaleString()}</p>
                </div>
                <div className="card p-5">
                  <p className="text-xs text-[var(--text-muted)] font-medium mb-1">Completed Bookings</p>
                  <p className="text-2xl font-black text-white">{data.bookingCount}</p>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-sm font-bold text-white mb-5">Daily Revenue</h3>
                {data.daily?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={data.daily} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="url(#revGrad)" name="Revenue (LKR)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-12 text-center text-sm text-[var(--text-muted)]">No revenue data in selected period</div>
                )}
              </div>

              {data.byBranch?.length > 0 && (
                <div className="card p-6">
                  <h3 className="text-sm font-bold text-white mb-5">Revenue by Branch</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.byBranch} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" fill="#8B5CF6" name="Revenue (LKR)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Staff Performance */}
          {activeTab === "staff" && data.staff && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-sm font-bold text-white mb-5">Staff Performance Comparison</h3>
                {data.staff?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.staff} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" fill="#8B5CF6" name="Total" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" fill="#10B981" name="Completed" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="noShow" fill="#EF4444" name="No Show" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-12 text-center text-sm text-[var(--text-muted)]">No staff data available</div>
                )}
              </div>

              <div className="card overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <h3 className="text-sm font-bold text-white">Staff Leaderboard</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {(data.staff || []).sort((a: any, b: any) => b.revenue - a.revenue).map((s: any, i: number) => (
                    <div key={s.staffId} className="flex items-center gap-4 p-4">
                      <span className={`text-lg font-black ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-[var(--text-muted)]"}`}>
                        #{i + 1}
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center text-sm font-bold text-[#A78BFA]">
                        {s.name?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{s.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{s.total} bookings · {s.completed} completed</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-400">LKR {s.revenue?.toLocaleString()}</p>
                        <p className="text-xs text-[var(--text-muted)]">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Service Reports */}
          {activeTab === "services" && data.services && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-sm font-bold text-white mb-5">Most Booked Services</h3>
                {data.services?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.services.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 60, left: 80, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 10 }} width={75} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#8B5CF6" name="Bookings" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-12 text-center text-sm text-[var(--text-muted)]">No service data available</div>
                )}
              </div>

              <div className="card overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <h3 className="text-sm font-bold text-white">Service Revenue Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Service</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Category</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Bookings</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(data.services || []).map((s: any) => (
                        <tr key={s.serviceId} className="hover:bg-white/2 transition-colors">
                          <td className="py-3 px-4 font-medium text-white">{s.name}</td>
                          <td className="py-3 px-4 text-[var(--text-muted)]">{s.category}</td>
                          <td className="py-3 px-4 text-center font-semibold text-[#A78BFA]">{s.count}</td>
                          <td className="py-3 px-4 text-right font-bold text-green-400">LKR {s.revenue?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
