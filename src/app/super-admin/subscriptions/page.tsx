"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  RotateCcw,
  Loader2,
  X,
  Edit,
  ShieldCheck,
  Calendar,
} from "lucide-react";

export default function SuperAdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, active: 0, trial: 0, mrr: 0 });
  const [loading, setLoading] = useState(true);

  // Edit Modal
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [newPlan, setNewPlan] = useState("STARTER");
  const [newStatus, setNewStatus] = useState("ACTIVE");
  const [newAmount, setNewAmount] = useState(0);
  const [daysToAdd, setDaysToAdd] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchSubscriptions = () => {
    setLoading(true);
    fetch("/api/super-admin/subscriptions")
      .then((res) => res.json())
      .then((data) => {
        if (data.subscriptions) setSubscriptions(data.subscriptions);
        if (data.stats) setStats(data.stats);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const openEditModal = (sub: any) => {
    setSelectedSub(sub);
    setNewPlan(sub.plan);
    setNewStatus(sub.status);
    setNewAmount(sub.amount);
    setDaysToAdd(30);
    setError("");
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/super-admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedSub.id,
          plan: newPlan,
          status: newStatus,
          amount: Number(newAmount),
          daysToAdd: Number(daysToAdd),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSelectedSub(null);
        fetchSubscriptions();
      } else {
        setError(data.error || "Failed to update subscription");
      }
    } catch {
      setError("Network error updating subscription");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
            SaaS Salon Subscriptions
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Manage platform subscription tiers, billing terms, active trials, and recurring revenue.
          </p>
        </div>

        <button
          onClick={fetchSubscriptions}
          className="p-2 rounded-xl bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[var(--text-muted)] hover:text-[#6D28D9] border border-[#E2E8F0] self-start sm:self-auto"
          title="Refresh"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#D97706] shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[var(--text-muted)]">Subscribed Salons</span>
            <h3 className="text-2xl font-black text-[#0F172A]">{stats.total}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#15803D] shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[var(--text-muted)]">Active Plans</span>
            <h3 className="text-2xl font-black text-[#0F172A]">{stats.active}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-[#1D4ED8] shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[var(--text-muted)]">Free / Trial Accounts</span>
            <h3 className="text-2xl font-black text-[#0F172A]">{stats.trial}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] flex items-center gap-4 bg-gradient-to-tr from-transparent to-amber-500/10">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#D97706] shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#D97706] font-semibold">Monthly MRR</span>
            <h3 className="text-2xl font-black text-[#0F172A]">
              Rs. {stats.mrr?.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            All Salon Subscriptions
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            Showing {subscriptions.length} records
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#D97706]" />
            <span>Loading subscriptions...</span>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            No salon subscriptions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Salon</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Tier Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Billing Fee</th>
                  <th className="py-3 px-4">Renewal Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F1F5F9] shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-[#0F172A] block">{s.salon?.name}</span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {s.salon?._count?.branches || 0} Branches • {s.salon?._count?.staff || 0} Staff
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      <span>{s.salon?.owner?.name}</span>
                      <span className="text-[11px] text-[var(--text-muted)] block">
                        {s.salon?.owner?.email}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                          s.plan === "ENTERPRISE"
                            ? "bg-purple-500/20 text-[#6D28D9] border border-purple-500/30"
                            : s.plan === "PROFESSIONAL"
                            ? "bg-amber-500/20 text-[#D97706] border border-amber-500/30"
                            : s.plan === "STARTER"
                            ? "bg-blue-500/20 text-[#1D4ED8] border border-blue-500/30"
                            : "bg-[#F8FAFC] text-[#334155]"
                        }`}
                      >
                        {s.plan}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-[#15803D] border-emerald-500/30"
                            : s.status === "TRIAL"
                            ? "bg-blue-500/10 text-[#1D4ED8] border-blue-500/30"
                            : "bg-red-500/10 text-[#B91C1C] border-red-500/30"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                      Rs. {s.amount?.toLocaleString()} <span className="text-[10px] text-[var(--text-muted)] font-normal">/mo</span>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      {s.endDate ? new Date(s.endDate).toISOString().split("T")[0] : "No Expiry"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(s)}
                        className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Edit className="w-3 h-3 text-[#D97706]" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Subscription Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E2E8F0] p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#D97706]" />
                Manage {selectedSub.salon?.name} Plan
              </h3>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#6D28D9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[#B91C1C] text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveSubscription} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Plan Tier</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]"
                >
                  <option value="FREE" className="bg-white text-[#0F172A]">FREE (Rs. 0)</option>
                  <option value="STARTER" className="bg-white text-[#0F172A]">STARTER (Rs. 4,900 / mo)</option>
                  <option value="PROFESSIONAL" className="bg-white text-[#0F172A]">PROFESSIONAL (Rs. 9,900 / mo)</option>
                  <option value="ENTERPRISE" className="bg-white text-[#0F172A]">ENTERPRISE (Custom)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]"
                  >
                    <option value="ACTIVE" className="bg-white text-[#0F172A]">ACTIVE</option>
                    <option value="TRIAL" className="bg-white text-[#0F172A]">TRIAL</option>
                    <option value="EXPIRED" className="bg-white text-[#0F172A]">EXPIRED</option>
                    <option value="CANCELLED" className="bg-white text-[#0F172A]">CANCELLED</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Fee (Rs.)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Extend Expiry / Renewal</label>
                <select
                  value={daysToAdd}
                  onChange={(e) => setDaysToAdd(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]"
                >
                  <option value={0} className="bg-white text-[#0F172A]">Keep current date</option>
                  <option value={30} className="bg-white text-[#0F172A]">+ 30 Days (1 Month)</option>
                  <option value={90} className="bg-white text-[#0F172A]">+ 90 Days (Quarterly)</option>
                  <option value={365} className="bg-white text-[#0F172A]">+ 365 Days (1 Year)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[#0F172A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Plan Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
