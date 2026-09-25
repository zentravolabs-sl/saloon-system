"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Scissors,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronLeft,
  Printer,
  Star,
  FileText,
  Phone,
  Mail,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function CustomerBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Review form state
  const [salonRating, setSalonRating] = useState(5);
  const [staffRating, setStaffRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const fetchBooking = () => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/bookings/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.booking) {
          setBooking(data.booking);
        } else {
          setError(data.error || "Booking not found");
        }
      })
      .catch(() => setError("Failed to load appointment details"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setSubmittingReview(true);
    setReviewError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          salonRating,
          staffRating,
          serviceRating,
          comment: reviewComment.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || "Failed to submit review");
      } else {
        setReviewSuccess(true);
        fetchBooking();
      }
    } catch {
      setReviewError("Network error submitting review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const steps = [
    { key: "PENDING", label: "Booked" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "CHECKED_IN", label: "Checked In" },
    { key: "IN_PROGRESS", label: "In Service" },
    { key: "COMPLETED", label: "Completed" },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case "PENDING":
        return 0;
      case "CONFIRMED":
        return 1;
      case "CHECKED_IN":
        return 2;
      case "IN_PROGRESS":
        return 3;
      case "COMPLETED":
        return 4;
      default:
        return -1;
    }
  };

  const currentStepIdx = booking ? getStepIndex(booking.status) : -1;
  const isCancelled = ["CANCELLED", "REJECTED", "NO_SHOW"].includes(booking?.status);

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B14] text-white">
      <div className="print:hidden">
        <PublicNavbar />
      </div>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6">
        <div className="print:hidden flex items-center justify-between">
          <Link
            href="/customer/bookings"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to All Appointments</span>
          </Link>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>

        {loading ? (
          <div className="py-24 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            <span>Loading booking details...</span>
          </div>
        ) : error || !booking ? (
          <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Unable to Load Appointment</h3>
            <p className="text-xs text-red-300">{error || "Booking not found"}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0C0E1A] border border-white/10 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-xs font-bold text-[#A78BFA]">
                    Booking Ref: {booking.reference}
                  </span>
                  <h1 className="text-2xl font-black text-white mt-1">
                    {booking.salon?.name}
                  </h1>
                  <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>{booking.branch?.name} • {booking.branch?.address}</span>
                  </p>
                </div>

                <div className="text-right sm:text-right">
                  <span
                    className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                      isCancelled
                        ? "bg-red-500/10 text-red-400 border-red-500/30"
                        : booking.status === "COMPLETED"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {booking.status.replace("_", " ")}
                  </span>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {booking.bookingDate?.split("T")[0]} at {booking.startTime}
                  </p>
                </div>
              </div>

              {/* Status Timeline */}
              {!isCancelled ? (
                <div className="pt-4 border-t border-white/10 print:hidden">
                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    {steps.map((st, idx) => {
                      const isPast = idx < currentStepIdx;
                      const isCurrent = idx === currentStepIdx;

                      return (
                        <div key={st.key} className="space-y-2">
                          <div
                            className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center text-xs font-bold transition-all ${
                              isPast
                                ? "bg-emerald-500 text-white"
                                : isCurrent
                                ? "bg-[#8B5CF6] text-white ring-4 ring-[#8B5CF6]/30 shadow-lg"
                                : "bg-white/10 text-[var(--text-muted)]"
                            }`}
                          >
                            {isPast ? "✓" : idx + 1}
                          </div>
                          <span
                            className={`text-[11px] block ${
                              isCurrent
                                ? "font-bold text-white"
                                : isPast
                                ? "text-emerald-400 font-medium"
                                : "text-[var(--text-muted)]"
                            }`}
                          >
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                  Appointment is marked as {booking.status}.
                  {booking.cancellationReason && (
                    <span className="block mt-0.5 text-white">
                      Reason: {booking.cancellationReason}
                    </span>
                  )}
                  {booking.rejectionReason && (
                    <span className="block mt-0.5 text-white">
                      Reason: {booking.rejectionReason}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Appointment Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Stylist & Location */}
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Assigned Stylist & Location
                </h3>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-white font-bold text-lg">
                    {booking.staff?.name?.charAt(0) || "S"}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{booking.staff?.name}</h4>
                    <span className="text-xs text-[var(--text-muted)]">
                      {booking.staff?.specialization || "Professional Barber / Stylist"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                    <span>{booking.branch?.address || booking.branch?.city}</span>
                  </div>
                  {booking.branch?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <span>{booking.branch?.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Customer & Notes
                </h3>

                <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Name:</span>
                    <span className="font-semibold text-white">{booking.customer?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Mobile:</span>
                    <span className="font-semibold text-white">{booking.customer?.phone}</span>
                  </div>
                  {booking.customerNotes && (
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-[var(--text-muted)] block">Customer Preference:</span>
                      <p className="text-white italic mt-0.5">&quot;{booking.customerNotes}&quot;</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Itemized Services & Receipt (Section 41) */}
            <div id="invoice" className="p-6 sm:p-8 rounded-3xl bg-[#0C0E1A] border border-white/10 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#8B5CF6]" />
                  Itemized Bill & Receipt
                </h3>
                {booking.invoice && (
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    Invoice #{booking.invoice.invoiceNumber}
                  </span>
                )}
              </div>

              <div className="space-y-3 text-xs">
                {booking.services?.map((bs: any) => (
                  <div key={bs.id} className="flex items-center justify-between py-1">
                    <div>
                      <span className="font-semibold text-white">{bs.service?.name}</span>
                      <span className="text-[var(--text-muted)] text-[11px] block">
                        Duration: {bs.duration} minutes
                      </span>
                    </div>
                    <span className="font-bold text-white">
                      Rs. {bs.price.toLocaleString()}
                    </span>
                  </div>
                ))}

                <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Subtotal</span>
                    <span>Rs. {booking.subtotal?.toLocaleString() || booking.totalAmount?.toLocaleString()}</span>
                  </div>

                  {booking.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Coupon Discount</span>
                      <span>- Rs. {booking.discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-base text-white pt-2 border-t border-white/10">
                    <span>Total Amount</span>
                    <span className="text-emerald-400">Rs. {booking.totalAmount.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] pt-1">
                    <span>Payment Method</span>
                    <span className="uppercase">{booking.payments?.[0]?.method || "Pay at Salon (Cash / Card)"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Review Section (Section 44) */}
            {booking.status === "COMPLETED" && (
              <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4 print:hidden">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    Rating & Experience Review
                  </h3>
                  {booking.review && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Review Published
                    </span>
                  )}
                </div>

                {booking.review ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < booking.review.salonRating ? "fill-amber-400" : "text-white/20"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-white font-bold">
                        {booking.review.salonRating} / 5 Stars
                      </span>
                    </div>
                    {booking.review.comment && (
                      <p className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-white/90 italic">
                        &quot;{booking.review.comment}&quot;
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
                    {reviewSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        Thank you! Your review has been submitted successfully.
                      </div>
                    )}
                    {reviewError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                        {reviewError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[var(--text-secondary)] font-medium">Salon Overall</label>
                        <select
                          value={salonRating}
                          onChange={(e) => setSalonRating(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white"
                        >
                          <option value={5} className="bg-[#111827]">5 Stars - Outstanding</option>
                          <option value={4} className="bg-[#111827]">4 Stars - Very Good</option>
                          <option value={3} className="bg-[#111827]">3 Stars - Average</option>
                          <option value={2} className="bg-[#111827]">2 Stars - Poor</option>
                          <option value={1} className="bg-[#111827]">1 Star - Terrible</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[var(--text-secondary)] font-medium">Stylist Technique</label>
                        <select
                          value={staffRating}
                          onChange={(e) => setStaffRating(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white"
                        >
                          <option value={5} className="bg-[#111827]">5 Stars - Master Barber</option>
                          <option value={4} className="bg-[#111827]">4 Stars - Great</option>
                          <option value={3} className="bg-[#111827]">3 Stars - Okay</option>
                          <option value={2} className="bg-[#111827]">2 Stars - Unsatisfied</option>
                          <option value={1} className="bg-[#111827]">1 Star - Disappointed</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[var(--text-secondary)] font-medium">Service Quality</label>
                        <select
                          value={serviceRating}
                          onChange={(e) => setServiceRating(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white"
                        >
                          <option value={5} className="bg-[#111827]">5 Stars - Highly Recommended</option>
                          <option value={4} className="bg-[#111827]">4 Stars - Good</option>
                          <option value={3} className="bg-[#111827]">3 Stars - Average</option>
                          <option value={2} className="bg-[#111827]">2 Stars - Needs Improvement</option>
                          <option value={1} className="bg-[#111827]">1 Star - Bad</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[var(--text-secondary)] font-medium">Written Feedback</label>
                      <textarea
                        rows={3}
                        placeholder="Tell others about your experience, styling finish, and comfort..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {submittingReview ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Star className="w-3.5 h-3.5 fill-white" />
                      )}
                      <span>Submit Review</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Book Again CTA */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-[#8B5CF6]/15 to-[#EC4899]/15 border border-[#8B5CF6]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
              <div>
                <h4 className="font-bold text-white text-sm">Loved your experience?</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Schedule your next appointment with {booking.staff?.name} at {booking.branch?.name}.
                </p>
              </div>

              <Link
                href={`/booking?salonId=${booking.salonId}&branchId=${booking.branchId}&staffId=${booking.staffId}`}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <span>Book Again</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>

      <div className="print:hidden">
        <PublicFooter />
      </div>
    </div>
  );
}
