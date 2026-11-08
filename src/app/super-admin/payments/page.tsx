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
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
            Platform Payments & Transactions
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Comprehensive audit of all booking receipts and customer payments across all partner salons.
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="p-2 rounded-xl bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[var(--text-muted)] hover:text-[#6D28D9] border border-[#E2E8F0] self-start sm:self-auto"
          title="Refresh"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] flex items-center gap-4 bg-gradient-to-tr from-transparent to-emerald-500/10">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[#15803D] shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#15803D] font-semibold">Total Platform Volume</span>
            <h3 className="text-2xl font-black text-[#0F172A]">
              Rs. {stats.totalVolume?.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#D97706] shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[var(--text-muted)]">Completed Transactions</span>
            <h3 className="text-2xl font-black text-[#0F172A]">{stats.totalTransactions}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-[#1D4ED8] shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[var(--text-muted)]">Active Salons</span>
            <h3 className="text-2xl font-black text-[#0F172A]">{salons.length}</h3>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="font-semibold text-[#0F172A]">Filter By:</span>
        </div>

        <select
          value={selectedSalon}
          onChange={(e) => setSelectedSalon(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] focus:outline-none"
        >
          <option value="" className="bg-white text-[#0F172A]">All Salons</option>
          {salons.map((s) => (
            <option key={s.id} value={s.id} className="bg-white text-[#0F172A]">
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] focus:outline-none"
        >
          <option value="" className="bg-white text-[#0F172A]">All Payment Methods</option>
          <option value="CASH" className="bg-white text-[#0F172A]">Cash at Salon</option>
          <option value="CARD" className="bg-white text-[#0F172A]">Credit / Debit Card</option>
          <option value="ONLINE" className="bg-white text-[#0F172A]">Online Gateway</option>
        </select>

        {(selectedSalon || selectedMethod) && (
          <button
            onClick={() => {
              setSelectedSalon("");
              setSelectedMethod("");
            }}
            className="text-[var(--text-muted)] hover:text-[#6D28D9] transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Transaction Ledger
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            Showing {payments.length} transactions
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#D97706]" />
            <span>Loading payment records...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            No transactions found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
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
              <tbody className="divide-y divide-[#E2E8F0]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F1F5F9] shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#6D28D9]">
                      {p.booking?.reference || "N/A"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#0F172A] block">{p.salonName}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {p.booking?.branch?.name || "Main Branch"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      <span className="font-medium text-[#0F172A] block">
                        {p.booking?.customer?.name || "Walk-in Guest"}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {p.booking?.customer?.phone || ""}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#15803D]">
                      Rs. {p.amount?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F8FAFC] border border-[#E2E8F0] uppercase">
                        {p.method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      {new Date(p.createdAt).toISOString().split("T")[0]}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-[#15803D] border border-emerald-500/30 uppercase">
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
