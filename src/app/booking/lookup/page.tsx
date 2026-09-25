"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scissors, Phone, Hash, Search, Loader2, CheckCircle2, Clock, XCircle, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";

const STATUS_STYLES: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", icon: Clock },
  CONFIRMED: { label: "Confirmed", color: "text-green-400 bg-green-400/10 border-green-400/20", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: XCircle },
  CANCELLED: { label: "Cancelled", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: XCircle },
  CHECKED_IN: { label: "Checked In", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", icon: CheckCircle2 },
  IN_PROGRESS: { label: "In Progress", color: "text-purple-400 bg-purple-400/10 border-purple-400/20", icon: Scissors },
  COMPLETED: { label: "Completed", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  NO_SHOW: { label: "No Show", color: "text-gray-400 bg-gray-400/10 border-gray-400/20", icon: AlertTriangle },
};

export default function BookingLookupPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !reference.trim()) return;

    setLoading(true);
    setError("");
    setBooking(null);

    try {
      const res = await fetch(`/api/bookings/lookup?phone=${encodeURIComponent(phone)}&reference=${encodeURIComponent(reference)}`);
      const data = await res.json();
      if (res.ok && data.booking) {
        setBooking(data.booking);
      } else {
        setError(data.error || "Booking not found. Please check your phone number and reference number.");
      }
    } catch {
      setError("Failed to search. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080911] text-white selection:bg-violet-500/30">
      <PublicNavbar />

      <div className="flex-1 max-w-2xl mx-auto px-4 py-16 w-full">
        {/* Header */}
        <div className="text-center mb-10 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-600/30">
            <Search className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white">Find Your Booking</h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">Enter your phone number and unique booking reference to look up live appointment status, invoices, or reviews.</p>
        </div>

        {/* Search Form */}
        <div className="card p-6 space-y-5">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="tel"
                  placeholder="+94 77 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[#8B5CF6]/50 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Booking Reference</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="e.g. GLM-20260924-00001"
                  value={reference}
                  onChange={(e) => setReference(e.target.value.toUpperCase())}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[#8B5CF6]/50 transition-colors font-mono"
                />
              </div>
            </div>
            {error && (
              <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-sm text-red-400">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading || !phone || !reference}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#8B5CF6]/20 disabled:opacity-50 hover:brightness-110 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Searching..." : "Find Booking"}
            </button>
          </form>
        </div>

        {/* Result */}
        {booking && (
          <div className="mt-6 card p-6 space-y-5">
            {/* Status badge */}
            {(() => {
              const statusInfo = STATUS_STYLES[booking.status] || STATUS_STYLES.PENDING;
              const StatusIcon = statusInfo.icon;
              return (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] font-medium">Booking Reference</p>
                    <p className="text-lg font-black text-white font-mono">{booking.reference}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${statusInfo.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusInfo.label}
                  </span>
                </div>
              );
            })()}

            <div className="border-t border-white/5 pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">Salon</p>
                <p className="text-sm font-semibold text-white">{booking.salon?.name}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">Branch</p>
                <p className="text-sm font-semibold text-white">{booking.branch?.name}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">Date</p>
                <p className="text-sm font-semibold text-white">
                  {new Date(booking.bookingDate).toLocaleDateString("en-LK", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">Time</p>
                <p className="text-sm font-semibold text-white">{booking.startTime} – {booking.endTime}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">Staff</p>
                <p className="text-sm font-semibold text-white">{booking.staff?.name}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-0.5">Total</p>
                <p className="text-sm font-semibold text-white">LKR {booking.totalAmount?.toLocaleString()}</p>
              </div>
            </div>

            {/* Services */}
            {booking.services?.length > 0 && (
              <div className="border-t border-white/5 pt-4">
                <p className="text-xs text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wider">Services</p>
                <div className="space-y-2">
                  {booking.services.map((bs: any) => (
                    <div key={bs.id} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">{bs.service?.name}</span>
                      <span className="text-white font-semibold">LKR {bs.price?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer notes */}
            {booking.customerNotes && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs text-[var(--text-muted)] mb-1">Your Notes</p>
                <p className="text-sm text-[var(--text-secondary)]">{booking.customerNotes}</p>
              </div>
            )}

            {/* Status-specific messages */}
            {booking.status === "CONFIRMED" && (
              <div className="p-3 rounded-xl bg-green-400/10 border border-green-400/20">
                <p className="text-sm text-green-400 font-semibold">✓ Your appointment is confirmed. Please arrive 5 minutes early.</p>
              </div>
            )}
            {booking.status === "PENDING" && (
              <div className="p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/20">
                <p className="text-sm text-yellow-400 font-semibold">⏳ Your booking is pending confirmation. You'll be notified once confirmed.</p>
              </div>
            )}
            {booking.status === "REJECTED" && booking.rejectionReason && (
              <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20">
                <p className="text-sm text-red-400 font-semibold">Reason: {booking.rejectionReason}</p>
              </div>
            )}
            {booking.status === "COMPLETED" && !booking.review && (
              <Link
                href={`/booking/review?bookingId=${booking.id}&ref=${booking.reference}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#8B5CF6]/30 text-[#A78BFA] text-sm font-semibold hover:bg-[#8B5CF6]/10 transition-colors"
              >
                Leave a Review
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}
