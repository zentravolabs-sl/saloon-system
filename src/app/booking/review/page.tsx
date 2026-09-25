"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Star, Scissors, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${(hover || value) >= n ? "text-yellow-400 fill-yellow-400" : "text-white/20"} transition-colors`}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-xs text-[var(--text-muted)] font-medium">
            {["", "Poor", "Fair", "Good", "Great", "Excellent"][value]}
          </span>
        )}
      </div>
    </div>
  );
}

function ReviewFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("bookingId");
  const ref = searchParams.get("ref");

  const [salonRating, setSalonRating] = useState(0);
  const [staffRating, setStaffRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId || salonRating === 0) {
      setError("Please select a salon rating to continue.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          rating: salonRating,
          staffRating: staffRating || undefined,
          serviceRating: serviceRating || undefined,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || "Failed to submit review");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!bookingId) {
    return (
      <div className="text-center py-16">
        <p className="text-white font-semibold">Invalid review link</p>
        <Link href="/" className="text-[#A78BFA] text-sm mt-2 inline-block hover:underline">Go home</Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-5">
        <div className="w-20 h-20 rounded-full bg-green-400/20 border-2 border-green-400/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Thank You!</h2>
          <p className="text-[var(--text-muted)] mt-2">Your review has been submitted. We appreciate your feedback!</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/booking/lookup`}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-[var(--text-secondary)] hover:text-white"
          >
            View Booking
          </Link>
          <Link
            href="/booking"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white text-sm font-bold"
          >
            Book Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-400/20">
          <Star className="w-8 h-8 text-white fill-white" />
        </div>
        <h1 className="text-2xl font-black text-white">How was your experience?</h1>
        {ref && <p className="text-sm text-[var(--text-muted)] mt-1">Booking: <span className="font-mono font-semibold text-white">{ref}</span></p>}
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <StarRating value={salonRating} onChange={setSalonRating} label="Overall Salon Rating *" />
        <StarRating value={staffRating} onChange={setStaffRating} label="Staff Rating (optional)" />
        <StarRating value={serviceRating} onChange={setServiceRating} label="Service Rating (optional)" />

        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Your Comments (optional)
          </label>
          <textarea
            rows={4}
            placeholder="Tell us about your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]/50 resize-none"
          />
          <p className="text-xs text-right text-[var(--text-muted)]">{comment.length}/1000</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-sm text-red-400">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting || salonRating === 0}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 hover:brightness-110 transition-all"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <div className="min-h-screen bg-[#0A0B14] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 bg-[#0C0E1A]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white -rotate-45" />
            </div>
            <span className="font-black text-base text-white">Zentravo</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" /></div>}>
          <ReviewFormContent />
        </Suspense>
      </div>
    </div>
  );
}
