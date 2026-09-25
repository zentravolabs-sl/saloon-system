"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Building2,
  Calendar,
  CreditCard,
  RotateCcw,
  Loader2,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react";

export default function SuperAdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [salons, setSalons] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalVolume: 0, totalTransactions: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSalon, setSelectedSalon] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");

  const fetchPayments = () => {
    setLoading(true);
    let url = `/api/super-admin/payments?`;
    if (selectedSalon) url += `salonId=${selectedSalon}&`;
    if (selectedMethod) url += `method=${selectedMethod}&`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.payments) setPayments(data.payments);
        if (data.salons) setSalons(data.salons);
        if (data.stats) setStats(data.stats);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayments();
  }, [selectedSalon, selectedMethod]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Platform Payments & Transactions
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Comprehensive audit of all booking receipts and customer payments across all partner salons.
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-white/10 self-start sm:self-auto"
          title="Refresh"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center gap-4 bg-gradient-to-tr from-transparent to-emerald-500/10">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-emerald-300 font-semibold">Total Platform Volume</span>
            <h3 className="text-2xl font-black text-white">
              Rs. {stats.totalVolume?.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[var(--text-muted)]">Completed Transactions</span>
            <h3 className="text-2xl font-black text-white">{stats.totalTransactions}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[var(--text-muted)]">Active Salons</span>
            <h3 className="text-2xl font-black text-white">{salons.length}</h3>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="font-semibold text-white">Filter By:</span>
        </div>

        <select
          value={selectedSalon}
          onChange={(e) => setSelectedSalon(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
        >
          <option value="" className="bg-[#111827]">All Salons</option>
          {salons.map((s) => (
            <option key={s.id} value={s.id} className="bg-[#111827]">
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
        >
          <option value="" className="bg-[#111827]">All Payment Methods</option>
          <option value="CASH" className="bg-[#111827]">Cash at Salon</option>
          <option value="CARD" className="bg-[#111827]">Credit / Debit Card</option>
          <option value="ONLINE" className="bg-[#111827]">Online Gateway</option>
        </select>

        {(selectedSalon || selectedMethod) && (
          <button
            onClick={() => {
              setSelectedSalon("");
              setSelectedMethod("");
            }}
            className="text-[var(--text-muted)] hover:text-white transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Transaction Ledger
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            Showing {payments.length} transactions
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            <span>Loading payment records...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            No transactions found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.03] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Salon & Branch</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#A78BFA]">
                      {p.booking?.reference || "N/A"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{p.salonName}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {p.booking?.branch?.name || "Main Branch"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      <span className="font-medium text-white block">
                        {p.booking?.customer?.name || "Walk-in Guest"}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {p.booking?.customer?.phone || ""}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400">
                      Rs. {p.amount?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 border border-white/10 uppercase">
                        {p.method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      {new Date(p.createdAt).toISOString().split("T")[0]}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                        {p.status}
                      </span>
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
