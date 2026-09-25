"use client";

import { useState, useEffect } from "react";
import {
  Tag,
  Plus,
  Calendar,
  Percent,
  DollarSign,
  X,
  Loader2,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useSalonStatus } from "@/context/SalonStatusContext";

export default function AdminCouponsPage() {
  const { isApproved } = useSalonStatus();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Coupon Modal
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState(10);
  const [minBookingValue, setMinBookingValue] = useState(1000);
  const [maxDiscount, setMaxDiscount] = useState(500);
  const [maxUses, setMaxUses] = useState(100);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchCoupons = () => {
    setLoading(true);
    fetch("/api/coupons")
      .then((res) => res.json())
      .then((data) => {
        if (data.coupons) setCoupons(data.coupons);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: Number(discountValue),
          minBookingValue: Number(minBookingValue),
          maxDiscount: Number(maxDiscount),
          maxUses: Number(maxUses),
          validUntil,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create coupon");
      } else {
        setShowModal(false);
        setCode("");
        fetchCoupons();
      }
    } catch {
      setError("Network error creating coupon");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Coupons & Promotions
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Create promotional discount codes for marketing campaigns and loyal clients.
          </p>
        </div>

        {isApproved ? (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Coupon</span>
          </button>
        ) : (
          <button
            disabled
            title="Salon registration is pending Super Admin approval. Creating coupons is locked."
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-amber-300/80 border border-amber-500/20 cursor-not-allowed flex items-center gap-1.5 opacity-80"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Create Coupon (Pending Approval)</span>
          </button>
        )}
      </div>

      {/* Coupons Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
          <span>Loading promotional coupons...</span>
        </div>
      ) : coupons.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
          <Tag className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-base font-bold text-white">No Coupons Configured</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Create discount codes like WELCOME10 to incentivize customer reservations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {coupons.map((c) => (
            <div
              key={c.id}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-black text-lg text-white block tracking-wider">
                    {c.code}
                  </span>
                  <span className="text-xs text-[#EC4899] font-bold">
                    {c.discountType === "PERCENTAGE"
                      ? `${c.discountValue}% OFF`
                      : `LKR ${c.discountValue} OFF`}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-[var(--text-secondary)] pt-2 border-t border-white/5">
                <div className="flex justify-between">
                  <span>Min Booking:</span>
                  <span className="font-semibold text-white">LKR {c.minBookingValue || 0}</span>
                </div>
                {c.maxDiscount && (
                  <div className="flex justify-between">
                    <span>Max Discount:</span>
                    <span className="font-semibold text-white">LKR {c.maxDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Total Usages:</span>
                  <span className="font-semibold text-white">
                    {c._count?.usages || 0} / {c.maxUses || "∞"}
                  </span>
                </div>
                {c.validUntil && (
                  <div className="flex justify-between">
                    <span>Valid Until:</span>
                    <span className="text-[var(--text-muted)]">
                      {new Date(c.validUntil).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0C0E1A] border border-white/10 p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#8B5CF6]" />
                Create Promo Code
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER20"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white uppercase focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  >
                    <option value="PERCENTAGE" className="bg-[#111827]">Percentage (%)</option>
                    <option value="FIXED" className="bg-[#111827]">Fixed Amount (LKR)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Min Booking Value</label>
                  <input
                    type="number"
                    value={minBookingValue}
                    onChange={(e) => setMinBookingValue(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Max Uses</label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Valid Until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
