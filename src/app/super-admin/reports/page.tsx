"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  DollarSign,
  Building2,
  Calendar,
  Users,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function SuperAdminReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [salons, setSalons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/super-admin/stats").then((res) => res.json()),
      fetch("/api/super-admin/salons").then((res) => res.json()),
    ])
      .then(([statsData, salonsData]) => {
        if (statsData.stats) setStats(statsData.stats);
        if (salonsData.salons) setSalons(salonsData.salons);
      })
      .finally(() => setLoading(false));
  }, []);

  const salonPerformanceData = salons.map((s) => ({
    name: s.name,
    branches: s._count?.branches || 0,
    staff: s._count?.staff || 0,
    bookings: s._count?.bookings || 0,
  }));

  return (
    <div className="space-y-8 animate-fadeIn w-full">
      <div>
        <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
          Platform-Wide SaaS Intelligence
        </h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Macro metrics across all salon tenants, subscription tiers, and overall system load.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#D97706]" />
          <span>Generating platform intelligence...</span>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] space-y-1">
              <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
                Platform GMV Revenue
              </span>
              <p className="text-2xl font-black text-[#0F172A]">
                LKR {(stats?.platformRevenue || 0).toLocaleString()}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] space-y-1">
              <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
                Active Tenant Salons
              </span>
              <p className="text-2xl font-black text-[#15803D]">
                {stats?.activeSalons || 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] space-y-1">
              <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
                Registered Clients
              </span>
              <p className="text-2xl font-black text-[#0F172A]">
                {stats?.totalCustomers || 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] space-y-1">
              <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase">
                Month-to-Date Bookings
              </span>
              <p className="text-2xl font-black text-[#D97706]">
                {stats?.monthlyBookings || 0}
              </p>
            </div>
          </div>

          {/* Salon Comparison Chart */}
          <div className="p-6 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#D97706]" />
                Tenant Capacity & Bookings Comparison
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Branches, staff headcount, and booking volume per salon brand
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salonPerformanceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6B7280" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="branches" fill="#8B5CF6" name="Branches" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="staff" fill="#06B6D4" name="Staff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bookings" fill="#EC4899" name="Bookings" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
