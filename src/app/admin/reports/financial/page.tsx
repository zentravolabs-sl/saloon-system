"use client";

import { useEffect, useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Calendar,
  Building2,
  PieChart,
  BarChart3,
  Loader2,
  Tag,
  Scissors,
  ShoppingCart,
  Percent,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wallet,
  Users,
} from "lucide-react";

interface FinancialSummary {
  serviceRevenue: string;
  productRevenue: string;
  totalRevenue: string;
  retailCogs: string;
  serviceCogs: string;
  totalCogs: string;
  grossProfit: string;
  grossMarginPercent: string;
  operatingExpenses: string;
  staffSalaryExpense: string;
  staffCommissionsPaid: string;
  netOperatingProfit: string;
  netMarginPercent: string;
  totalOutstanding: string;
}

interface FinancialData {
  summary: FinancialSummary;
  expensesByCategory: Record<string, { name: string; amount: string }>;
  branchBreakdown: Array<{
    branchId: string;
    branchName: string;
    revenue: string;
    cogs: string;
    expenses: string;
    payroll: string;
    netProfit: string;
  }>;
  from: string;
  to: string;
  currency: string;
}

export default function FinancialReportPage() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const [from, setFrom] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [to, setTo] = useState(now.toISOString().split("T")[0]);

  useEffect(() => {
    fetchMeta();
    fetchReport();
  }, []);

  const fetchMeta = async () => {
    try {
      const res = await fetch("/api/ops/meta");
      const d = await res.json();
      if (d.branches) setBranches(d.branches);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      if (selectedBranchId) params.append("branchId", selectedBranchId);

      const res = await fetch(`/api/reports/financial?${params.toString()}`);
      const d = await res.json();
      if (d.summary) setData(d);
    } catch (err) {
      console.error("Failed to load financial report", err);
    } finally {
      setLoading(false);
    }
  };

  const setQuickRange = (type: "30days" | "month" | "quarter" | "year") => {
    const today = new Date();
    let startDate = new Date();

    if (type === "30days") {
      startDate.setDate(today.getDate() - 30);
    } else if (type === "month") {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (type === "quarter") {
      const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
      startDate = new Date(today.getFullYear(), quarterMonth, 1);
    } else if (type === "year") {
      startDate = new Date(today.getFullYear(), 0, 1);
    }

    setFrom(startDate.toISOString().split("T")[0]);
    setTo(today.toISOString().split("T")[0]);
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    params.append("export", "csv");
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    if (selectedBranchId) params.append("branchId", selectedBranchId);
    window.open(`/api/reports/financial?${params.toString()}`, "_blank");
  };

  const formatLKR = (val: string | number) => {
    return `Rs. ${Number(val || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const summary = data?.summary;
  const isNetPositive = Number(summary?.netOperatingProfit || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-[#8B5CF6]" />
            Financial & Profitability Reports
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Consolidated Profit & Loss (P&L), Cost of Goods Sold (COGS), operating overheads, and net margins.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] font-semibold">Quick Ranges:</span>
          {[
            { id: "30days", label: "Last 30 Days" },
            { id: "month", label: "This Month" },
            { id: "quarter", label: "This Quarter" },
            { id: "year", label: "This Year" },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setQuickRange(r.id as any);
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-colors"
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
            />
            <span className="text-xs text-[var(--text-muted)]">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="" className="bg-[#0C0E1A]">All Branches (Consolidated)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-[#0C0E1A]">{b.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchReport}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white"
          >
            Apply
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-[var(--text-muted)] bg-[#0C0E1A] rounded-2xl border border-white/10">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#8B5CF6] mb-3" />
          Computing financial analytics and P&L statements...
        </div>
      ) : !summary ? (
        <div className="p-12 text-center text-[var(--text-muted)] bg-[#0C0E1A] rounded-2xl border border-white/10">
          No financial records found for the selected time range.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="p-5 rounded-2xl bg-[#0C0E1A] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Total Gross Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {formatLKR(summary.totalRevenue)}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] flex items-center justify-between pt-1 border-t border-white/5">
                <span>Services: {formatLKR(summary.serviceRevenue)}</span>
                <span>Retail: {formatLKR(summary.productRevenue)}</span>
              </div>
            </div>

            {/* Gross Profit & Margin */}
            <div className="p-5 rounded-2xl bg-[#0C0E1A] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Gross Profit (After COGS)</span>
                <Percent className="w-4 h-4 text-[#8B5CF6]" />
              </div>
              <div className="text-2xl font-black text-[#A78BFA] font-mono">
                {formatLKR(summary.grossProfit)}
              </div>
              <div className="text-[11px] text-[#A78BFA] flex items-center justify-between pt-1 border-t border-white/5 font-semibold">
                <span>Gross Margin: {summary.grossMarginPercent}%</span>
                <span>COGS: {formatLKR(summary.totalCogs)}</span>
              </div>
            </div>

            {/* Operating Overheads & Payroll */}
            <div className="p-5 rounded-2xl bg-[#0C0E1A] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Total Operating Overhead</span>
                <Wallet className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono">
                {formatLKR(Number(summary.operatingExpenses) + Number(summary.staffSalaryExpense))}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] flex items-center justify-between pt-1 border-t border-white/5">
                <span>OpEx: {formatLKR(summary.operatingExpenses)}</span>
                <span>Payroll: {formatLKR(summary.staffSalaryExpense)}</span>
              </div>
            </div>

            {/* Net Operating Profit */}
            <div
              className={`p-5 rounded-2xl border space-y-2 ${
                isNetPositive
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-white/80">
                <span>Net Operating Profit</span>
                {isNetPositive ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div
                className={`text-2xl font-black font-mono ${
                  isNetPositive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatLKR(summary.netOperatingProfit)}
              </div>
              <div
                className={`text-[11px] font-bold flex items-center justify-between pt-1 border-t border-white/10 ${
                  isNetPositive ? "text-emerald-300" : "text-red-300"
                }`}
              >
                <span>Net Margin: {summary.netMarginPercent}%</span>
                <span>{isNetPositive ? "Profitable" : "Deficit"}</span>
              </div>
            </div>
          </div>

          {/* Detailed Financial Breakdown Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue & COGS Structure */}
            <div className="p-5 rounded-2xl bg-[#0C0E1A] border border-white/10 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#8B5CF6]" />
                Revenue & Cost of Goods Sold (COGS)
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div>
                    <div className="font-bold text-white">Service Revenue</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Completed salon appointments</div>
                  </div>
                  <div className="font-mono font-bold text-sm text-white">
                    {formatLKR(summary.serviceRevenue)}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div>
                    <div className="font-bold text-white">Retail Product Sales</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Point-of-sale merchandise</div>
                  </div>
                  <div className="font-mono font-bold text-sm text-white">
                    {formatLKR(summary.productRevenue)}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div>
                    <div className="font-bold text-purple-300">Total Gross Revenue</div>
                  </div>
                  <div className="font-mono font-bold text-sm text-purple-300">
                    {formatLKR(summary.totalRevenue)}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Retail Merchandise Cost:</span>
                    <span className="font-mono text-red-400">-{formatLKR(summary.retailCogs)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Backbar Product Consumption:</span>
                    <span className="font-mono text-red-400">-{formatLKR(summary.serviceCogs)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white pt-1 border-t border-white/5">
                    <span>Total Cost of Goods Sold (COGS):</span>
                    <span className="font-mono text-red-400">-{formatLKR(summary.totalCogs)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overheads & Categories Breakdown */}
            <div className="p-5 rounded-2xl bg-[#0C0E1A] border border-white/10 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-pink-400" />
                Operating Overheads & Payroll
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div>
                    <div className="font-bold text-white">Staff Wages & Base Salaries</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Approved and paid staff compensation</div>
                  </div>
                  <div className="font-mono font-bold text-sm text-white">
                    {formatLKR(summary.staffSalaryExpense)}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div>
                    <div className="font-bold text-white">Staff Commissions Disbursed</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Performance earnings included in payroll</div>
                  </div>
                  <div className="font-mono font-bold text-sm text-white">
                    {formatLKR(summary.staffCommissionsPaid)}
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Expenses by Category:
                  </div>
                  {Object.entries(data.expensesByCategory).map(([id, cat]) => (
                    <div key={id} className="flex justify-between text-[var(--text-secondary)]">
                      <span>{cat.name}</span>
                      <span className="font-mono text-white">{formatLKR(cat.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-white pt-2 border-t border-white/5">
                    <span>Total Operating Expenses:</span>
                    <span className="font-mono text-amber-400">{formatLKR(summary.operatingExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Branch Profitability Table */}
          {data.branchBreakdown && data.branchBreakdown.length > 0 && (
            <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden space-y-3 p-5">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#8B5CF6]" />
                Branch Performance & Profitability Comparison
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[var(--text-muted)]">
                      <th className="pb-3 font-bold">Branch Location</th>
                      <th className="pb-3 font-bold text-right">Revenue</th>
                      <th className="pb-3 font-bold text-right">COGS</th>
                      <th className="pb-3 font-bold text-right">OpEx</th>
                      <th className="pb-3 font-bold text-right">Payroll</th>
                      <th className="pb-3 font-bold text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.branchBreakdown.map((b) => {
                      const net = Number(b.netProfit);
                      return (
                        <tr key={b.branchId} className="hover:bg-white/[0.02]">
                          <td className="py-3 font-bold text-white">{b.branchName}</td>
                          <td className="py-3 text-right font-mono font-semibold text-white">
                            {formatLKR(b.revenue)}
                          </td>
                          <td className="py-3 text-right font-mono text-red-400">
                            -{formatLKR(b.cogs)}
                          </td>
                          <td className="py-3 text-right font-mono text-amber-400">
                            -{formatLKR(b.expenses)}
                          </td>
                          <td className="py-3 text-right font-mono text-white/70">
                            -{formatLKR(b.payroll)}
                          </td>
                          <td
                            className={`py-3 text-right font-mono font-bold ${
                              net >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {formatLKR(b.netProfit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Accounts Receivable / Outstanding Balance Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white">Accounts Receivable / Pending Payments:</span>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Uncollected balances from open booking appointments and credit sales.
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-black text-amber-300 font-mono">
                {formatLKR(summary.totalOutstanding)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
