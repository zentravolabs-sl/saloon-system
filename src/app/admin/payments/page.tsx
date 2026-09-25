"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Search,
  DollarSign,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Receipt,
  Filter,
  Download,
  Banknote,
  Smartphone,
  Building2,
} from "lucide-react";

const METHOD_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  CASH: { label: "Cash", icon: Banknote, color: "text-green-400 bg-green-400/10" },
  CARD: { label: "Card", icon: CreditCard, color: "text-blue-400 bg-blue-400/10" },
  ONLINE: { label: "Online", icon: Smartphone, color: "text-purple-400 bg-purple-400/10" },
  BANK: { label: "Bank Transfer", icon: Building2, color: "text-yellow-400 bg-yellow-400/10" },
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "text-green-400 bg-green-400/10 border border-green-400/20",
  PENDING: "text-yellow-400 bg-yellow-400/10 border border-yellow-400/20",
  REFUNDED: "text-red-400 bg-red-400/10 border border-red-400/20",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ bookingId: "", amount: "", method: "CASH", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [foundBooking, setFoundBooking] = useState<any>(null);
  const [searchingBooking, setSearchingBooking] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments");
      const data = await res.json();
      if (data.payments) {
        setPayments(data.payments);
        setTotalRevenue(data.payments.reduce((sum: number, p: any) => sum + p.amount, 0));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const searchBooking = async () => {
    if (!bookingSearch.trim()) return;
    setSearchingBooking(true);
    try {
      const res = await fetch(`/api/bookings?search=${encodeURIComponent(bookingSearch)}`);
      const data = await res.json();
      if (data.bookings?.length > 0) {
        setFoundBooking(data.bookings[0]);
        setForm((f) => ({ ...f, bookingId: data.bookings[0].id, amount: String(data.bookings[0].totalAmount - (data.bookings[0].paidAmount || 0)) }));
      } else {
        setFoundBooking(null);
      }
    } finally {
      setSearchingBooking(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.bookingId || !form.amount) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ bookingId: "", amount: "", method: "CASH", notes: "" });
        setFoundBooking(null);
        setBookingSearch("");
        fetchPayments();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.booking?.customer?.name?.toLowerCase().includes(q) ||
      p.booking?.customer?.phone?.includes(q) ||
      p.reference?.toLowerCase().includes(q)
    );
  });

  const totalToday = payments.filter((p) => {
    const today = new Date();
    const pDate = new Date(p.createdAt);
    return pDate.toDateString() === today.toDateString();
  }).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Track and record all payment transactions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/20"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `LKR ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-green-400 bg-green-400/10" },
          { label: "Today's Revenue", value: `LKR ${totalToday.toLocaleString()}`, icon: Clock, color: "text-blue-400 bg-blue-400/10" },
          { label: "Total Transactions", value: payments.length, icon: Receipt, color: "text-purple-400 bg-purple-400/10" },
          { label: "Avg. Transaction", value: payments.length > 0 ? `LKR ${Math.round(totalRevenue / payments.length).toLocaleString()}` : "LKR 0", icon: CheckCircle2, color: "text-yellow-400 bg-yellow-400/10" },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">{s.label}</p>
                <p className="text-lg font-bold text-white">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-white font-semibold">No payments found</p>
            <p className="text-sm text-[var(--text-muted)]">Record your first payment to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white"
            >
              Record Payment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Branch</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Method</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Amount</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((payment) => {
                  const methodInfo = METHOD_LABELS[payment.method] || METHOD_LABELS.CASH;
                  return (
                    <tr key={payment.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-white text-sm">{payment.booking?.customer?.name || "—"}</p>
                          <p className="text-xs text-[var(--text-muted)]">{payment.booking?.customer?.phone}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-[var(--text-secondary)]">{payment.booking?.branch?.name || "—"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${methodInfo.color}`}>
                          <methodInfo.icon className="w-3 h-3" />
                          {methodInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white font-bold">LKR {payment.amount.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${STATUS_COLORS[payment.status] || STATUS_COLORS.COMPLETED}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-[var(--text-muted)]">
                          {new Date(payment.createdAt).toLocaleDateString("en-LK", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-[var(--text-muted)]">{payment.notes || "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Record Payment</h2>
              <button onClick={() => { setShowModal(false); setFoundBooking(null); setBookingSearch(""); }} className="p-2 hover:bg-white/5 rounded-xl">
                <span className="text-[var(--text-muted)] text-lg leading-none">×</span>
              </button>
            </div>

            {/* Booking search */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Find Booking (by reference or customer phone)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. GLM-20260924-00001"
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchBooking()}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]/50"
                />
                <button
                  onClick={searchBooking}
                  disabled={searchingBooking}
                  className="px-3 py-2.5 rounded-xl bg-[#8B5CF6]/20 text-[#A78BFA] text-sm font-semibold hover:bg-[#8B5CF6]/30"
                >
                  {searchingBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
              {foundBooking && (
                <div className="p-3 rounded-xl bg-green-400/10 border border-green-400/20 text-sm">
                  <p className="text-green-400 font-semibold">{foundBooking.customer?.name} — {foundBooking.reference}</p>
                  <p className="text-green-400/70 text-xs mt-0.5">
                    Total: LKR {foundBooking.totalAmount?.toLocaleString()} · Paid: LKR {(foundBooking.paidAmount || 0).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Amount (LKR)</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]/50"
              />
            </div>

            {/* Method */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(METHOD_LABELS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setForm((f) => ({ ...f, method: key }))}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                      form.method === key
                        ? "border-[#8B5CF6] bg-[#8B5CF6]/20 text-white"
                        : "border-white/10 bg-white/5 text-[var(--text-muted)] hover:border-white/20"
                    }`}
                  >
                    <val.icon className="w-3.5 h-3.5" />
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Notes (optional)</label>
              <input
                type="text"
                placeholder="e.g. Cash received at counter"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]/50"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowModal(false); setFoundBooking(null); setBookingSearch(""); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-[var(--text-secondary)] hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.bookingId || !form.amount}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
