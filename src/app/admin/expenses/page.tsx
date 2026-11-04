"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  Building2,
  Tag,
  Repeat,
  Loader2,
  ArrowUpRight,
  TrendingDown,
  Trash2,
  Paperclip,
  Eye,
  Check,
  X,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  paymentMethod: string;
  vendor?: string;
  reference?: string;
  description?: string;
  taxDeductible: boolean;
  branch?: { id: string; name: string };
  category?: { id: string; name: string; color?: string };
  attachments?: Array<{ id: string; file: { id: string; originalName: string; mimeType: string; sizeBytes: number } }>;
  createdByUser?: { name: string; email: string };
  approvedByUser?: { name: string };
  rejectionReason?: string;
}

interface Recurring {
  id: string;
  title: string;
  amount: number;
  frequency: string;
  nextRunDate: string;
  active: boolean;
  autoApprove: boolean;
  vendor?: string;
  category?: { name: string };
  branch?: { name: string };
}

interface SummaryData {
  totalCount: number;
  totalAmount: number;
  byStatus: Record<string, { count: number; total: number }>;
  byCategory: Array<{ categoryId: string; name: string; count: number; total: number }>;
}

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<"expenses" | "recurring" | "categories" | "summary">("expenses");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [approvalModal, setApprovalModal] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    categoryId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    branchId: "",
    paymentMethod: "CASH",
    vendor: "",
    reference: "",
    description: "",
    taxDeductible: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Recurring Form State
  const [recurringForm, setRecurringForm] = useState({
    title: "",
    categoryId: "",
    amount: "",
    frequency: "MONTHLY",
    startDate: new Date().toISOString().split("T")[0],
    branchId: "",
    vendor: "",
    autoApprove: false,
  });

  // Category Form State
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    color: "#8B5CF6",
  });

  // Load Initial Metadata
  useEffect(() => {
    fetchMeta();
    fetchExpenses();
  }, []);

  const fetchMeta = async () => {
    try {
      const [metaRes, catRes, sumRes] = await Promise.all([
        fetch("/api/ops/meta"),
        fetch("/api/expenses/categories"),
        fetch("/api/expenses/summary"),
      ]);
      const meta = await metaRes.json();
      const cats = await catRes.json();
      const sum = await sumRes.json();

      if (meta.branches) setBranches(meta.branches);
      if (cats.categories) setCategories(cats.categories);
      if (sum.summary) setSummary(sum.summary);
    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (branchFilter !== "ALL") params.append("branchId", branchFilter);
      if (categoryFilter !== "ALL") params.append("categoryId", categoryFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (search) params.append("search", search);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      const data = await res.json();
      if (data.expenses) setExpenses(data.expenses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecurring = async () => {
    try {
      const res = await fetch("/api/expenses/recurring");
      const data = await res.json();
      if (data.recurringExpenses) setRecurring(data.recurringExpenses);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === "recurring") fetchRecurring();
    if (activeTab === "summary") {
      fetch("/api/expenses/summary")
        .then((r) => r.json())
        .then((d) => d.summary && setSummary(d.summary));
    }
  }, [activeTab]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount || !expenseForm.categoryId) {
      alert("Please fill in required fields: Title, Category, Amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount),
          branchId: expenseForm.branchId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create expense");

      // Upload attachment if any
      if (selectedFile && data.expense?.id) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        await fetch(`/api/expenses/${data.expense.id}/attachments`, {
          method: "POST",
          body: formData,
        });
      }

      setShowExpenseModal(false);
      setExpenseForm({
        title: "",
        categoryId: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        branchId: "",
        paymentMethod: "CASH",
        vendor: "",
        reference: "",
        description: "",
        taxDeductible: false,
      });
      setSelectedFile(null);
      fetchExpenses();
      fetchMeta();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReject = async () => {
    if (!approvalModal) return;
    setSubmitting(true);
    try {
      const newStatus = approvalModal.action === "approve" ? "APPROVED" : "REJECTED";
      const res = await fetch(`/api/expenses/${approvalModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          rejectionReason: approvalModal.action === "reject" ? rejectionReason : undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to update status");
      setApprovalModal(null);
      setRejectionReason("");
      fetchExpenses();
      fetchMeta();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...recurringForm,
          amount: Number(recurringForm.amount),
          branchId: recurringForm.branchId || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to create recurring template");
      setShowRecurringModal(false);
      fetchRecurring();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to create category");
      setShowCategoryModal(false);
      setCategoryForm({ name: "", description: "", color: "#8B5CF6" });
      fetchMeta();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessRecurring = async () => {
    if (!confirm("Process pending recurring expenses now?")) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses/recurring", { method: "PUT" });
      const d = await res.json();
      alert(d.message || "Recurring expenses processed!");
      fetchRecurring();
      fetchExpenses();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    params.append("format", "csv");
    if (statusFilter !== "ALL") params.append("status", statusFilter);
    if (branchFilter !== "ALL") params.append("branchId", branchFilter);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    window.open(`/api/expenses?${params.toString()}`, "_blank");
  };

  const formatLKR = (val: number) => {
    return `Rs. ${Number(val || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        exp.title.toLowerCase().includes(q) ||
        (exp.vendor && exp.vendor.toLowerCase().includes(q)) ||
        (exp.reference && exp.reference.toLowerCase().includes(q)) ||
        (exp.category?.name && exp.category.name.toLowerCase().includes(q))
      );
    });
  }, [expenses, search]);

  const approvedTotal = summary?.byStatus?.APPROVED?.total || 0;
  const pendingTotal = summary?.byStatus?.PENDING?.total || 0;
  const pendingCount = summary?.byStatus?.PENDING?.count || 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Wallet className="w-7 h-7 text-[#8B5CF6]" />
            Expense Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Track salon operating costs, manage recurring bills, categorize expenditures, and handle approvals.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Approved Expenses</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white">{formatLKR(approvedTotal)}</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <span>Approved & Accounted</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-300">{formatLKR(pendingTotal)}</div>
          <div className="text-[11px] text-amber-400/80 mt-1">{pendingCount} request(s) awaiting action</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Active Categories</span>
            <Tag className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white">{categories.length}</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">Rent, Utilities, Supplies & more</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>Recurring Templates</span>
            <Repeat className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-xl font-bold text-white">{recurring.length || "Active"}</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">Automated periodic bills</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: "expenses", label: "All Expenses", icon: Wallet },
          { id: "recurring", label: "Recurring Expenses", icon: Repeat },
          { id: "categories", label: "Categories", icon: Tag },
          { id: "summary", label: "Analytics & Breakdown", icon: ArrowUpRight },
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

      {/* TAB 1: ALL EXPENSES */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3.5 rounded-2xl bg-[#0C0E1A] border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search title, vendor, ref..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* Status */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  fetchExpenses();
                }}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ALL" className="bg-[#0C0E1A]">All Statuses</option>
                <option value="PENDING" className="bg-[#0C0E1A]">Pending</option>
                <option value="APPROVED" className="bg-[#0C0E1A]">Approved</option>
                <option value="REJECTED" className="bg-[#0C0E1A]">Rejected</option>
              </select>

              {/* Branch */}
              <select
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  fetchExpenses();
                }}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ALL" className="bg-[#0C0E1A]">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#0C0E1A]">{b.name}</option>
                ))}
              </select>

              {/* Category */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  fetchExpenses();
                }}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ALL" className="bg-[#0C0E1A]">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0C0E1A]">{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              />
              <span className="text-xs text-[var(--text-muted)]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              />
              <button
                onClick={fetchExpenses}
                className="p-1.5 rounded-xl bg-white/5 text-[var(--text-secondary)] hover:text-white"
                title="Apply Filter"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[var(--text-muted)] bg-white/[0.02]">
                    <th className="p-3.5 font-bold">Expense / Vendor</th>
                    <th className="p-3.5 font-bold">Category</th>
                    <th className="p-3.5 font-bold">Branch</th>
                    <th className="p-3.5 font-bold">Date</th>
                    <th className="p-3.5 font-bold">Payment</th>
                    <th className="p-3.5 font-bold text-right">Amount</th>
                    <th className="p-3.5 font-bold text-center">Status</th>
                    <th className="p-3.5 font-bold text-right">Receipt / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#8B5CF6] mb-2" />
                        Loading expenses...
                      </td>
                    </tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">
                        No expenses found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-white">{exp.title}</div>
                          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                            {exp.vendor && <span>Vendor: {exp.vendor}</span>}
                            {exp.reference && <span>• Ref: {exp.reference}</span>}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{
                              backgroundColor: `${exp.category?.color || "#8B5CF6"}20`,
                              color: exp.category?.color || "#A78BFA",
                            }}
                          >
                            {exp.category?.name || "General"}
                          </span>
                        </td>
                        <td className="p-3.5 text-[var(--text-secondary)]">
                          {exp.branch?.name || "All Branches"}
                        </td>
                        <td className="p-3.5 text-[var(--text-secondary)]">
                          {new Date(exp.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-white/5 text-[11px] font-medium text-white/80">
                            {exp.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-bold text-white">
                          {formatLKR(exp.amount)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              exp.status === "APPROVED"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : exp.status === "PENDING"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {exp.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {exp.attachments && exp.attachments.length > 0 && (
                              <a
                                href={`/api/files/${exp.attachments[0].file.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-white/5 text-[#A78BFA] hover:bg-[#8B5CF6]/20 transition-colors"
                                title="View Receipt"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {exp.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => setApprovalModal({ id: exp.id, action: "approve" })}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                  title="Approve"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setApprovalModal({ id: exp.id, action: "reject" })}
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                  title="Reject"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
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

      {/* TAB 2: RECURRING EXPENSES */}
      {activeTab === "recurring" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              Automatically scheduled bills like Rent, Electricity, Internet, and Equipment leasing.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleProcessRecurring}
                disabled={submitting}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
              >
                <Repeat className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>Process Due Bills</span>
              </button>
              <button
                onClick={() => setShowRecurringModal(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Template</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-[#0C0E1A] border border-white/10 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[var(--text-muted)] bg-white/[0.02]">
                  <th className="p-3.5 font-bold">Title</th>
                  <th className="p-3.5 font-bold">Category</th>
                  <th className="p-3.5 font-bold">Frequency</th>
                  <th className="p-3.5 font-bold">Next Due Date</th>
                  <th className="p-3.5 font-bold">Auto-Approve</th>
                  <th className="p-3.5 font-bold text-right">Amount</th>
                  <th className="p-3.5 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recurring.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">
                      No recurring expense templates yet. Click "Add Template" to set one up.
                    </td>
                  </tr>
                ) : (
                  recurring.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 font-bold text-white">
                        {item.title}
                        {item.vendor && <div className="text-[11px] text-[var(--text-muted)] font-normal">{item.vendor}</div>}
                      </td>
                      <td className="p-3.5 text-[var(--text-secondary)]">{item.category?.name || "General"}</td>
                      <td className="p-3.5 font-semibold text-purple-400">{item.frequency}</td>
                      <td className="p-3.5 text-[var(--text-secondary)]">
                        {new Date(item.nextRunDate).toLocaleDateString()}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.autoApprove ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-[var(--text-muted)]"}`}>
                          {item.autoApprove ? "YES" : "NO"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold text-white">{formatLKR(item.amount)}</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                          {item.active ? "ACTIVE" : "PAUSED"}
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

      {/* TAB 3: CATEGORIES */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              Expense categories used to organize cost accounting and tax deductions.
            </p>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl bg-[#0C0E1A] border border-white/10 flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${c.color || "#8B5CF6"}25`, color: c.color || "#8B5CF6" }}
                >
                  <Tag className="w-5 h-5" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-sm text-white truncate">{c.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                    {c.description || "General expense category"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SUMMARY & BREAKDOWN */}
      {activeTab === "summary" && summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Table */}
            <div className="p-5 rounded-2xl bg-[#0C0E1A] border border-white/10 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#8B5CF6]" />
                Expenses by Category
              </h3>
              <div className="space-y-3">
                {summary.byCategory.map((cat) => {
                  const pct = summary.totalAmount > 0 ? (cat.total / summary.totalAmount) * 100 : 0;
                  return (
                    <div key={cat.categoryId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{cat.name} ({cat.count})</span>
                        <span className="text-[var(--text-secondary)] font-mono">{formatLKR(cat.total)} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="p-5 rounded-2xl bg-[#0C0E1A] border border-white/10 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Approval Status Breakdown
              </h3>
              <div className="space-y-3">
                {Object.entries(summary.byStatus).map(([status, stat]) => (
                  <div key={status} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider text-white">{status}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{stat.count} record(s)</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-white">{formatLKR(stat.total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0C0E1A] border border-white/10 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#8B5CF6]" />
                Record New Expense
              </h2>
              <button onClick={() => setShowExpenseModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              {/* 1. Category */}
              <div>
                <label className="block text-white mb-1 font-bold text-sm">Category *</label>
                <select
                  required
                  value={expenseForm.categoryId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
                  className="w-full bg-[#131524] border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="" className="bg-[#0C0E1A]">Select expense category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#0C0E1A]">{c.name}</option>
                  ))}
                </select>
              </div>

              {/* 2. Amount */}
              <div>
                <label className="block text-white mb-1 font-bold text-sm">Amount (LKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full bg-[#131524] border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-base font-bold placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* 3. Description */}
              <div>
                <label className="block text-white mb-1 font-bold text-sm">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity bill, cleaning supplies, salon towels"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value, description: e.target.value })}
                  className="w-full bg-[#131524] border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* 4. Date & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white mb-1 font-bold text-sm">Date</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full bg-[#131524] border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label className="block text-white mb-1 font-bold text-sm">Payment Method</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full bg-[#131524] border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="CASH" className="bg-[#0C0E1A]">Cash</option>
                    <option value="CARD" className="bg-[#0C0E1A]">Card</option>
                    <option value="BANK" className="bg-[#0C0E1A]">Bank Transfer</option>
                    <option value="ONLINE" className="bg-[#0C0E1A]">Online</option>
                  </select>
                </div>
              </div>

              {/* Progressive Disclosure: Advanced / Optional Settings */}
              <details className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
                <summary className="font-semibold text-[#A78BFA] cursor-pointer select-none">
                  More Options (Branch, Vendor, Receipt #, File Attachment)
                </summary>
                <div className="space-y-3 pt-3 mt-1 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--text-muted)] mb-1 font-semibold">Branch (Optional)</label>
                      <select
                        value={expenseForm.branchId}
                        onChange={(e) => setExpenseForm({ ...expenseForm, branchId: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8B5CF6]"
                      >
                        <option value="" className="bg-[#0C0E1A]">All Branches (HQ)</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id} className="bg-[#0C0E1A]">{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[var(--text-muted)] mb-1 font-semibold">Vendor / Supplier</label>
                      <input
                        type="text"
                        placeholder="e.g. Ceylon Electricity Board"
                        value={expenseForm.vendor}
                        onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[var(--text-muted)] mb-1 font-semibold">Invoice / Reference #</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-99021"
                      value={expenseForm.reference}
                      onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-muted)] mb-1 font-semibold">Attach Receipt (PDF, PNG, JPG)</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-[var(--text-muted)] file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#8B5CF6] file:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="taxDeductible"
                      checked={expenseForm.taxDeductible}
                      onChange={(e) => setExpenseForm({ ...expenseForm, taxDeductible: e.target.checked })}
                      className="rounded border-white/20 bg-white/5 text-[#8B5CF6]"
                    />
                    <label htmlFor="taxDeductible" className="text-white cursor-pointer select-none">
                      Tax deductible business expense
                    </label>
                  </div>
                </div>
              </details>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVAL / REJECTION MODAL */}
      {approvalModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">
              {approvalModal.action === "approve" ? "Approve Expense" : "Reject Expense"}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {approvalModal.action === "approve"
                ? "This expense will be approved and incorporated into financial reports and P&L."
                : "Please specify the reason for rejecting this expense claim."}
            </p>
            {approvalModal.action === "reject" && (
              <textarea
                rows={3}
                required
                placeholder="Reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
              />
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setApprovalModal(null)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 text-xs font-semibold text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveReject}
                disabled={submitting}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white ${
                  approvalModal.action === "approve"
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {submitting ? "Saving..." : approvalModal.action === "approve" ? "Confirm Approval" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECURRING MODAL */}
      {showRecurringModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[#8B5CF6]" />
                New Recurring Expense Template
              </h3>
              <button onClick={() => setShowRecurringModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecurring} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Branch Rent"
                  value={recurringForm.title}
                  onChange={(e) => setRecurringForm({ ...recurringForm, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Category *</label>
                  <select
                    required
                    value={recurringForm.categoryId}
                    onChange={(e) => setRecurringForm({ ...recurringForm, categoryId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="" className="bg-[#0C0E1A]">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0C0E1A]">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Amount (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={recurringForm.amount}
                    onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Frequency</label>
                  <select
                    value={recurringForm.frequency}
                    onChange={(e) => setRecurringForm({ ...recurringForm, frequency: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="MONTHLY" className="bg-[#0C0E1A]">Monthly</option>
                    <option value="WEEKLY" className="bg-[#0C0E1A]">Weekly</option>
                    <option value="QUARTERLY" className="bg-[#0C0E1A]">Quarterly</option>
                    <option value="YEARLY" className="bg-[#0C0E1A]">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={recurringForm.startDate}
                    onChange={(e) => setRecurringForm({ ...recurringForm, startDate: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoApprove"
                  checked={recurringForm.autoApprove}
                  onChange={(e) => setRecurringForm({ ...recurringForm, autoApprove: e.target.checked })}
                  className="rounded border-white/20 bg-white/5 text-[#8B5CF6]"
                />
                <label htmlFor="autoApprove" className="text-white cursor-pointer select-none">
                  Auto-approve generated expenses
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRecurringModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold"
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white">Create Category</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marketing, Staff Welfare"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Category purpose..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[var(--text-muted)] mb-1">Color Tag</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-8 h-8 rounded-lg bg-transparent cursor-pointer"
                  />
                  <span className="text-[var(--text-muted)] font-mono">{categoryForm.color}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
