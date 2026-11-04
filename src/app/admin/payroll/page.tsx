"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Banknote,
  Plus,
  Search,
  Users,
  CheckCircle2,
  Clock,
  Printer,
  Lock,
  DollarSign,
  TrendingUp,
  Loader2,
  X,
  Check,
  Calendar,
  Building2,
  FileText,
  CreditCard,
  AlertCircle,
  Eye,
} from "lucide-react";
import Link from "next/link";

interface PayrollPeriod {
  id: string;
  year: number;
  month: number;
  status: "DRAFT" | "APPROVED" | "PAID" | "LOCKED";
  startDate: string;
  endDate: string;
  branch?: { id: string; name: string };
  records: Array<{
    id: string;
    staffId: string;
    staffName: string;
    basicSalary: number;
    commissionAmount: number;
    bonusAmount: number;
    deductionAmount: number;
    netSalary: number;
    status: string;
    staff: { id: string; name: string; email: string };
  }>;
}

interface Compensation {
  id: string;
  staffId: string;
  salaryType: string;
  baseRate: number;
  overtimeHourlyRate: number;
  allowanceAmount: number;
  staff: { id: string; name: string };
}

interface Advance {
  id: string;
  amount: number;
  balanceRemaining: number;
  monthlyDeduction: number;
  status: string;
  requestDate: string;
  staff: { id: string; name: string };
}

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<"history" | "compensation" | "advances">("history");
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [compensations, setCompensations] = useState<Compensation[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCompModal, setShowCompModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  // Forms
  const now = new Date();
  const [generateForm, setGenerateForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    branchId: "",
  });

  const [compForm, setCompForm] = useState({
    staffId: "",
    salaryType: "BASIC_PLUS_COMMISSION",
    baseRate: "50000",
    overtimeHourlyRate: "350",
    allowanceAmount: "5000",
  });

  const [advanceForm, setAdvanceForm] = useState({
    staffId: "",
    amount: "10000",
    monthlyDeduction: "2500",
    reason: "",
  });

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const [staffRes, metaRes, recRes, compRes, advRes] = await Promise.all([
        fetch("/api/staff"),
        fetch("/api/ops/meta"),
        fetch("/api/payroll/records"),
        fetch("/api/payroll/compensation"),
        fetch("/api/payroll/advances"),
      ]);
      const st = await staffRes.json();
      const me = await metaRes.json();
      const rec = await recRes.json();
      const comp = await compRes.json();
      const adv = await advRes.json();

      if (st.staff) setStaffList(st.staff);
      if (me.branches) setBranches(me.branches);
      if (rec.periods) setPeriods(rec.periods);
      if (comp.compensations) setCompensations(comp.compensations);
      if (adv.advances) setAdvances(adv.advances);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await fetch("/api/payroll/records");
      const d = await res.json();
      if (d.periods) setPeriods(d.periods);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(generateForm.year),
          month: Number(generateForm.month),
          branchId: generateForm.branchId || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to generate payroll");
      setShowGenerateModal(false);
      fetchPeriods();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCompensation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/payroll/compensation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: compForm.staffId,
          salaryType: compForm.salaryType,
          baseRate: Number(compForm.baseRate),
          overtimeHourlyRate: Number(compForm.overtimeHourlyRate),
          allowanceAmount: Number(compForm.allowanceAmount),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to save salary setup");
      setShowCompModal(false);
      fetchInitial();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/payroll/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: advanceForm.staffId,
          amount: Number(advanceForm.amount),
          monthlyDeduction: Number(advanceForm.monthlyDeduction),
          reason: advanceForm.reason,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to issue advance");
      setShowAdvanceModal(false);
      fetchInitial();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePeriodAction = async (periodId: string, action: "approve" | "pay") => {
    try {
      const res = await fetch(`/api/payroll/records/${periodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action === "approve" ? "APPROVED" : "PAID" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to update payroll period");
      fetchPeriods();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatLKR = (val: number) => {
    return `Rs. ${Number(val || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const totalPayrollYTD = useMemo(() => {
    return periods.reduce((sum, p) => {
      const pSum = p.records.reduce((rSum, r) => rSum + (r.netSalary || 0), 0);
      return sum + pSum;
    }, 0);
  }, [periods]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Banknote className="w-7 h-7 text-[#8B5CF6]" />
            Staff Salary & Monthly Payroll
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Automate monthly salary calculations, commissions aggregation, advance recoveries, and official payslip generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (staffList.length > 0) {
                setAdvanceForm({
                  staffId: staffList[0]?.id || "",
                  amount: "10000",
                  monthlyDeduction: "2500",
                  reason: "",
                });
              }
              setShowAdvanceModal(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Issue Salary Advance</span>
          </button>
          <button
            onClick={() => {
              if (staffList.length > 0) {
                setCompForm({
                  staffId: staffList[0]?.id || "",
                  salaryType: "BASIC_PLUS_COMMISSION",
                  baseRate: "50000",
                  overtimeHourlyRate: "350",
                  allowanceAmount: "5000",
                });
              }
              setShowCompModal(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Salary Setup</span>
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Monthly Payroll</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Total Payroll Disbursed</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white">{formatLKR(totalPayrollYTD)}</div>
          <div className="text-[11px] text-emerald-400 mt-1">Net compensation across runs</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Configured Staff</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white">{compensations.length} Active</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">Salary structures setup</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Active Salary Advances</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-300">
            {formatLKR(advances.reduce((s, a) => s + (a.balanceRemaining || 0), 0))}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">{advances.length} staff balance(s)</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Payroll Runs</span>
            <Calendar className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-xl font-bold text-white">{periods.length} Periods</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">Historical monthly runs</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: "history", label: "Monthly Payroll Runs", icon: Calendar },
          { id: "compensation", label: "Salary Compensation Setup", icon: Users },
          { id: "advances", label: "Salary Advances & Recovery", icon: CreditCard },
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

      {/* TAB 1: PAYROLL RUNS */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {loading ? (
            <div className="p-12 text-center text-[var(--text-muted)]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B5CF6] mb-2" />
              Loading payroll history...
            </div>
          ) : periods.length === 0 ? (
            <div className="p-12 text-center text-[var(--text-muted)] bg-[#0C0E1A] rounded-2xl border border-white/10">
              No payroll runs generated yet. Click "Generate Monthly Payroll" to start for this month.
            </div>
          ) : (
            periods.map((period) => {
              const periodNetTotal = period.records.reduce((s, r) => s + (r.netSalary || 0), 0);
              const periodCommTotal = period.records.reduce((s, r) => s + (r.commissionAmount || 0), 0);

              return (
                <div
                  key={period.id}
                  className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden space-y-3"
                >
                  {/* Period Header */}
                  <div className="p-4 bg-white/[0.02] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA] font-bold text-sm">
                        {period.month}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{monthNames[period.month - 1]} {period.year}</span>
                          {period.branch && (
                            <span className="text-[11px] font-normal text-[var(--text-muted)]">
                              • {period.branch.name}
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {new Date(period.startDate).toLocaleDateString()} to {new Date(period.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] text-[var(--text-muted)]">Total Disbursed</div>
                        <div className="font-mono font-bold text-sm text-emerald-400">
                          {formatLKR(periodNetTotal)}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          period.status === "PAID"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : period.status === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {period.status}
                      </span>

                      {period.status === "DRAFT" && (
                        <button
                          onClick={() => handlePeriodAction(period.id, "approve")}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        >
                          Approve Run
                        </button>
                      )}

                      {period.status === "APPROVED" && (
                        <button
                          onClick={() => handlePeriodAction(period.id, "pay")}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                        >
                          Mark as Paid
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Period Records Table */}
                  <div className="p-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-[var(--text-muted)] border-b border-white/5">
                            <th className="pb-2.5 font-bold">Employee</th>
                            <th className="pb-2.5 font-bold text-right">Basic Salary</th>
                            <th className="pb-2.5 font-bold text-right">Commissions</th>
                            <th className="pb-2.5 font-bold text-right">Bonuses</th>
                            <th className="pb-2.5 font-bold text-right">Deductions</th>
                            <th className="pb-2.5 font-bold text-right">Net Payable</th>
                            <th className="pb-2.5 font-bold text-right">Payslip</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {period.records.map((rec) => (
                            <tr key={rec.id} className="hover:bg-white/[0.01]">
                              <td className="py-2.5 font-bold text-white">
                                {rec.staff?.name || rec.staffName}
                              </td>
                              <td className="py-2.5 text-right font-mono text-[var(--text-secondary)]">
                                {formatLKR(rec.basicSalary)}
                              </td>
                              <td className="py-2.5 text-right font-mono text-purple-400 font-semibold">
                                {formatLKR(rec.commissionAmount)}
                              </td>
                              <td className="py-2.5 text-right font-mono text-emerald-400">
                                {rec.bonusAmount > 0 ? `+${formatLKR(rec.bonusAmount)}` : "—"}
                              </td>
                              <td className="py-2.5 text-right font-mono text-red-400">
                                {rec.deductionAmount > 0 ? `-${formatLKR(rec.deductionAmount)}` : "—"}
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold text-white">
                                {formatLKR(rec.netSalary)}
                              </td>
                              <td className="py-2.5 text-right">
                                <Link
                                  href={`/admin/payroll/${rec.id}/payslip`}
                                  className="p-1.5 rounded-lg bg-white/5 text-[#A78BFA] hover:bg-[#8B5CF6]/20 inline-flex items-center gap-1 text-[11px] font-semibold transition-colors"
                                  title="Print Payslip"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Payslip</span>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: COMPENSATION SETUP */}
      {activeTab === "compensation" && (
        <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[var(--text-muted)] bg-white/[0.02]">
                  <th className="p-3.5 font-bold">Staff Member</th>
                  <th className="p-3.5 font-bold">Salary Model</th>
                  <th className="p-3.5 font-bold text-right">Base Pay Rate</th>
                  <th className="p-3.5 font-bold text-right">Overtime / Hour</th>
                  <th className="p-3.5 font-bold text-right">Fixed Allowance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {compensations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                      No staff salary compensation defined. Click "Salary Setup" above to configure your staff pay structure.
                    </td>
                  </tr>
                ) : (
                  compensations.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 font-bold text-white">{c.staff?.name}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-purple-500/10 text-purple-400">
                          {c.salaryType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-white">
                        {formatLKR(c.baseRate)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-[var(--text-secondary)]">
                        {formatLKR(c.overtimeHourlyRate)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-emerald-400">
                        {formatLKR(c.allowanceAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SALARY ADVANCES */}
      {activeTab === "advances" && (
        <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[var(--text-muted)] bg-white/[0.02]">
                  <th className="p-3.5 font-bold">Staff Member</th>
                  <th className="p-3.5 font-bold">Request Date</th>
                  <th className="p-3.5 font-bold text-right">Original Advance</th>
                  <th className="p-3.5 font-bold text-right">Monthly Recovery</th>
                  <th className="p-3.5 font-bold text-right">Remaining Balance</th>
                  <th className="p-3.5 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {advances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                      No active salary advances recorded.
                    </td>
                  </tr>
                ) : (
                  advances.map((a) => (
                    <tr key={a.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 font-bold text-white">{a.staff?.name}</td>
                      <td className="p-3.5 text-[var(--text-secondary)]">
                        {new Date(a.requestDate).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right font-mono text-white">
                        {formatLKR(a.amount)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-red-400">
                        {formatLKR(a.monthlyDeduction)} / month
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-amber-300">
                        {formatLKR(a.balanceRemaining)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.balanceRemaining <= 0
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {a.balanceRemaining <= 0 ? "RECOVERED" : "ACTIVE"}
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

      {/* GENERATE PAYROLL MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#8B5CF6]" />
                Generate Monthly Payroll Run
              </h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGeneratePayroll} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Year *</label>
                  <input
                    type="number"
                    required
                    value={generateForm.year}
                    onChange={(e) => setGenerateForm({ ...generateForm, year: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Month *</label>
                  <select
                    value={generateForm.month}
                    onChange={(e) => setGenerateForm({ ...generateForm, month: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    {monthNames.map((m, idx) => (
                      <option key={idx} value={idx + 1} className="bg-[#0C0E1A]">
                        {idx + 1} - {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Branch Scope</label>
                <select
                  value={generateForm.branchId}
                  onChange={(e) => setGenerateForm({ ...generateForm, branchId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="" className="bg-[#0C0E1A]">All Salon Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#0C0E1A]">{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] space-y-1">
                <p>The payroll calculation engine will:</p>
                <ul className="list-disc list-inside text-white/80 space-y-0.5">
                  <li>Apply basic salary by model (Fixed, Hourly, etc.)</li>
                  <li>Aggregate all approved staff commissions for this period</li>
                  <li>Recover active salary advances up to the monthly deduction</li>
                  <li>Generate official payslips ready for print or download</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold"
                >
                  {submitting ? "Calculating..." : "Compute & Generate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALARY COMPENSATION SETUP MODAL */}
      {showCompModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#8B5CF6]" />
                Staff Salary Setup
              </h3>
              <button onClick={() => setShowCompModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompensation} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Staff Member *</label>
                <select
                  required
                  value={compForm.staffId}
                  onChange={(e) => setCompForm({ ...compForm, staffId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0C0E1A]">{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Salary Structure Model</label>
                <select
                  value={compForm.salaryType}
                  onChange={(e) => setCompForm({ ...compForm, salaryType: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="BASIC_PLUS_COMMISSION" className="bg-[#0C0E1A]">Basic + Commission</option>
                  <option value="FIXED" className="bg-[#0C0E1A]">Fixed Monthly Salary</option>
                  <option value="COMMISSION_ONLY" className="bg-[#0C0E1A]">Commission Only (100% Commission)</option>
                  <option value="HOURLY" className="bg-[#0C0E1A]">Hourly Rate</option>
                  <option value="DAILY" className="bg-[#0C0E1A]">Daily Rate</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Base Rate (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={compForm.baseRate}
                    onChange={(e) => setCompForm({ ...compForm, baseRate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Overtime / Hour (LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={compForm.overtimeHourlyRate}
                    onChange={(e) => setCompForm({ ...compForm, overtimeHourlyRate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Fixed Monthly Allowance</label>
                <input
                  type="number"
                  step="0.01"
                  value={compForm.allowanceAmount}
                  onChange={(e) => setCompForm({ ...compForm, allowanceAmount: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCompModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold"
                >
                  Save Compensation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALARY ADVANCE MODAL */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#8B5CF6]" />
                Issue Staff Salary Advance
              </h3>
              <button onClick={() => setShowAdvanceModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdvance} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Staff Member *</label>
                <select
                  required
                  value={advanceForm.staffId}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, staffId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0C0E1A]">{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Advance Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={advanceForm.amount}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Monthly Deduction</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={advanceForm.monthlyDeduction}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, monthlyDeduction: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Medical emergency, Festival advance"
                  value={advanceForm.reason}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold"
                >
                  Issue Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
