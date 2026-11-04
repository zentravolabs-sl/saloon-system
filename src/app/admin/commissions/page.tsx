"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Award,
  Plus,
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Scissors,
  Package,
  Building2,
  DollarSign,
  TrendingUp,
  Loader2,
  X,
  Check,
  Edit,
  Trash2,
  Calendar,
  Tag,
} from "lucide-react";

interface CommissionEntry {
  id: string;
  sourceType: "BOOKING" | "SALE" | "MANUAL";
  sourceId?: string;
  sourceRef?: string;
  baseAmount: number;
  commissionType: "PERCENTAGE" | "FIXED";
  rate: number;
  commissionAmount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "VOIDED";
  createdAt: string;
  notes?: string;
  staff: { id: string; name: string };
  branch?: { id: string; name: string };
}

interface CommissionRule {
  id: string;
  name: string;
  type: "PERCENTAGE" | "FIXED";
  rate: number;
  isActive: boolean;
  minThreshold?: number;
  staff?: { id: string; name: string };
  service?: { id: string; name: string };
  product?: { id: string; name: string };
  branch?: { id: string; name: string };
}

interface StaffSummary {
  staffId: string;
  staffName: string;
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  entriesCount: number;
}

export default function CommissionsPage() {
  const [activeTab, setActiveTab] = useState<"entries" | "summary" | "rules">("entries");
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string }>>([]);
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [ruleForm, setRuleForm] = useState({
    name: "",
    staffId: "",
    serviceId: "",
    productId: "",
    branchId: "",
    type: "PERCENTAGE",
    rate: "10",
    minThreshold: "",
    isActive: true,
  });

  const [adjustForm, setAdjustForm] = useState({
    staffId: "",
    branchId: "",
    amount: "",
    notes: "",
  });

  useEffect(() => {
    fetchMeta();
    fetchEntries();
  }, []);

  const fetchMeta = async () => {
    try {
      const [staffRes, svcRes, prodRes, metaRes, rulesRes] = await Promise.all([
        fetch("/api/staff"),
        fetch("/api/services"),
        fetch("/api/inventory/products"),
        fetch("/api/ops/meta"),
        fetch("/api/commissions/rules"),
      ]);
      const st = await staffRes.json();
      const sv = await svcRes.json();
      const pr = await prodRes.json();
      const me = await metaRes.json();
      const ru = await rulesRes.json();

      if (st.staff) setStaffList(st.staff);
      if (sv.services) setServices(sv.services);
      if (pr.products) setProducts(pr.products);
      if (me.branches) setBranches(me.branches);
      if (ru.rules) setRules(ru.rules);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (staffFilter !== "ALL") params.append("staffId", staffFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/commissions/entries?${params.toString()}`);
      const data = await res.json();
      if (data.entries) setEntries(data.entries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/commissions/rules");
      const data = await res.json();
      if (data.rules) setRules(data.rules);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === "rules") fetchRules();
    if (activeTab === "entries") fetchEntries();
  }, [activeTab, staffFilter, statusFilter]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/commissions/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ruleForm,
          rate: Number(ruleForm.rate),
          minThreshold: ruleForm.minThreshold ? Number(ruleForm.minThreshold) : undefined,
          staffId: ruleForm.staffId || undefined,
          serviceId: ruleForm.serviceId || undefined,
          productId: ruleForm.productId || undefined,
          branchId: ruleForm.branchId || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to create rule");
      setShowRuleModal(false);
      fetchRules();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/commissions/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: adjustForm.staffId,
          branchId: adjustForm.branchId || undefined,
          amount: Number(adjustForm.amount),
          notes: adjustForm.notes,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to add adjustment");
      setShowAdjustModal(false);
      setAdjustForm({ staffId: "", branchId: "", amount: "", notes: "" });
      fetchEntries();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: "APPROVED" | "VOIDED") => {
    try {
      const res = await fetch(`/api/commissions/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to update entry");
      fetchEntries();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatLKR = (val: number) => {
    return `Rs. ${Number(val || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Aggregated summary by staff
  const staffSummaries: StaffSummary[] = useMemo(() => {
    const map = new Map<string, StaffSummary>();
    entries.forEach((e) => {
      const current = map.get(e.staff.id) || {
        staffId: e.staff.id,
        staffName: e.staff.name,
        totalPending: 0,
        totalApproved: 0,
        totalPaid: 0,
        entriesCount: 0,
      };

      current.entriesCount += 1;
      if (e.status === "PENDING") current.totalPending += e.commissionAmount;
      if (e.status === "APPROVED") current.totalApproved += e.commissionAmount;
      if (e.status === "PAID") current.totalPaid += e.commissionAmount;
      map.set(e.staff.id, current);
    });
    return Array.from(map.values());
  }, [entries]);

  const totalCommissionsEarned = entries
    .filter((e) => e.status !== "VOIDED")
    .reduce((sum, e) => sum + e.commissionAmount, 0);

  const totalCommissionsPending = entries
    .filter((e) => e.status === "PENDING")
    .reduce((sum, e) => sum + e.commissionAmount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Award className="w-7 h-7 text-[#8B5CF6]" />
            Staff Commission Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Tiered commission rules for services and product sales with duplicate prevention and automated payroll integration.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (staffList.length > 0) {
                setAdjustForm({
                  staffId: staffList[0]?.id || "",
                  branchId: branches[0]?.id || "",
                  amount: "",
                  notes: "",
                });
              }
              setShowAdjustModal(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Adjustment</span>
          </button>
          <button
            onClick={() => setShowRuleModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Rule</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Total Commissions</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white">{formatLKR(totalCommissionsEarned)}</div>
          <div className="text-[11px] text-emerald-400 mt-1">Service & retail earnings</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Pending Payout</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-300">{formatLKR(totalCommissionsPending)}</div>
          <div className="text-[11px] text-amber-400/80 mt-1">Ready for monthly payroll</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Commissioned Staff</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white">{staffSummaries.length} Staff</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">Active earners</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Configured Rules</span>
            <Award className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-xl font-bold text-white">{rules.length} Rules</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">Service / product rates</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: "entries", label: "Commission Entries", icon: Award },
          { id: "summary", label: "Staff Payout Summary", icon: Users },
          { id: "rules", label: "Commission Rules", icon: Tag },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20"
                  : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: COMMISSION ENTRIES */}
      {activeTab === "entries" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#0C0E1A] border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ALL" className="bg-[#0C0E1A]">All Staff Members</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#0C0E1A]">{s.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ALL" className="bg-[#0C0E1A]">All Statuses</option>
                <option value="PENDING" className="bg-[#0C0E1A]">Pending</option>
                <option value="APPROVED" className="bg-[#0C0E1A]">Approved</option>
                <option value="PAID" className="bg-[#0C0E1A]">Paid</option>
                <option value="VOIDED" className="bg-[#0C0E1A]">Voided</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[var(--text-muted)] bg-white/[0.02]">
                    <th className="p-3.5 font-bold">Staff Member</th>
                    <th className="p-3.5 font-bold">Source</th>
                    <th className="p-3.5 font-bold">Branch</th>
                    <th className="p-3.5 font-bold">Date</th>
                    <th className="p-3.5 font-bold text-right">Base Amount</th>
                    <th className="p-3.5 font-bold text-center">Rate</th>
                    <th className="p-3.5 font-bold text-right">Commission</th>
                    <th className="p-3.5 font-bold text-center">Status</th>
                    <th className="p-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-[var(--text-muted)]">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#8B5CF6] mb-2" />
                        Loading commissions...
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-[var(--text-muted)]">
                        No commission entries recorded.
                      </td>
                    </tr>
                  ) : (
                    entries.map((ent) => (
                      <tr key={ent.id} className="hover:bg-white/[0.02]">
                        <td className="p-3.5 font-bold text-white">{ent.staff.name}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-white/5 text-[var(--text-secondary)]">
                            {ent.sourceType} {ent.sourceRef ? `(${ent.sourceRef})` : ""}
                          </span>
                        </td>
                        <td className="p-3.5 text-[var(--text-secondary)]">
                          {ent.branch?.name || "HQ / Central"}
                        </td>
                        <td className="p-3.5 text-[var(--text-secondary)]">
                          {new Date(ent.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 text-right font-mono text-[var(--text-secondary)]">
                          {formatLKR(ent.baseAmount)}
                        </td>
                        <td className="p-3.5 text-center font-mono text-purple-400">
                          {ent.commissionType === "PERCENTAGE" ? `${ent.rate}%` : formatLKR(ent.rate)}
                        </td>
                        <td className="p-3.5 text-right font-bold text-emerald-400 font-mono">
                          {formatLKR(ent.commissionAmount)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ent.status === "APPROVED"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : ent.status === "PENDING"
                                ? "bg-amber-500/20 text-amber-300"
                                : ent.status === "PAID"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {ent.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {ent.status === "PENDING" && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleUpdateStatus(ent.id, "APPROVED")}
                                className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                title="Approve"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(ent.id, "VOIDED")}
                                className="p-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                title="Void"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF SUMMARY */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffSummaries.length === 0 ? (
            <div className="col-span-full p-8 text-center text-[var(--text-muted)] bg-[#0C0E1A] rounded-2xl border border-white/10">
              No staff commission activity found.
            </div>
          ) : (
            staffSummaries.map((ss) => (
              <div key={ss.staffId} className="p-5 rounded-2xl bg-[#0C0E1A] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/20 text-[#A78BFA] flex items-center justify-center font-bold text-xs">
                      {ss.staffName.charAt(0)}
                    </div>
                    <span>{ss.staffName}</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] font-mono">
                    {ss.entriesCount} entries
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Pending Payout:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {formatLKR(ss.totalPending)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Approved for Payroll:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatLKR(ss.totalApproved)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">Paid Out to Date:</span>
                    <span className="font-mono font-bold text-blue-400">
                      {formatLKR(ss.totalPaid)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: COMMISSION RULES */}
      {activeTab === "rules" && (
        <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[var(--text-muted)] bg-white/[0.02]">
                  <th className="p-3.5 font-bold">Rule Name</th>
                  <th className="p-3.5 font-bold">Target Staff</th>
                  <th className="p-3.5 font-bold">Applies To</th>
                  <th className="p-3.5 font-bold">Branch Scope</th>
                  <th className="p-3.5 font-bold text-center">Type</th>
                  <th className="p-3.5 font-bold text-right">Commission Rate</th>
                  <th className="p-3.5 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">
                      No commission rules defined. Default salon setting applies or click "Create Rule" above.
                    </td>
                  </tr>
                ) : (
                  rules.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 font-bold text-white">{r.name}</td>
                      <td className="p-3.5 text-purple-400">
                        {r.staff?.name || "All Staff Members"}
                      </td>
                      <td className="p-3.5 text-white">
                        {r.service && <span>Service: {r.service.name}</span>}
                        {r.product && <span>Product: {r.product.name}</span>}
                        {!r.service && !r.product && (
                          <span className="text-[var(--text-muted)]">All Services & Retail</span>
                        )}
                      </td>
                      <td className="p-3.5 text-[var(--text-secondary)]">
                        {r.branch?.name || "All Branches"}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-semibold text-white">
                          {r.type}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-400 font-mono">
                        {r.type === "PERCENTAGE" ? `${r.rate}%` : formatLKR(r.rate)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {r.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE RULE MODAL */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-[#8B5CF6]" />
                Create Commission Rule
              </h3>
              <button onClick={() => setShowRuleModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Barber Haircut 20%, Retail Sales 10%"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Staff Member</label>
                  <select
                    value={ruleForm.staffId}
                    onChange={(e) => setRuleForm({ ...ruleForm, staffId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="" className="bg-[#0C0E1A]">All Staff (Global)</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#0C0E1A]">{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Branch Scope</label>
                  <select
                    value={ruleForm.branchId}
                    onChange={(e) => setRuleForm({ ...ruleForm, branchId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="" className="bg-[#0C0E1A]">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-[#0C0E1A]">{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Specific Service</label>
                  <select
                    value={ruleForm.serviceId}
                    onChange={(e) => setRuleForm({ ...ruleForm, serviceId: e.target.value, productId: "" })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="" className="bg-[#0C0E1A]">Any / None</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#0C0E1A]">{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Specific Product</label>
                  <select
                    value={ruleForm.productId}
                    onChange={(e) => setRuleForm({ ...ruleForm, productId: e.target.value, serviceId: "" })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="" className="bg-[#0C0E1A]">Any / None</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#0C0E1A]">{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Type</label>
                  <select
                    value={ruleForm.type}
                    onChange={(e) => setRuleForm({ ...ruleForm, type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="PERCENTAGE" className="bg-[#0C0E1A]">Percentage (%)</option>
                    <option value="FIXED" className="bg-[#0C0E1A]">Fixed Amount (LKR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Rate Value *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={ruleForm.type === "PERCENTAGE" ? "10" : "500.00"}
                    value={ruleForm.rate}
                    onChange={(e) => setRuleForm({ ...ruleForm, rate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL ADJUSTMENT MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white">Manual Commission Adjustment</h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1">Staff Member *</label>
                <select
                  required
                  value={adjustForm.staffId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, staffId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0C0E1A]">{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1">Adjustment Amount (LKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 2500.00"
                  value={adjustForm.amount}
                  onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Performance bonus for high client satisfaction..."
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold"
                >
                  Post Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
