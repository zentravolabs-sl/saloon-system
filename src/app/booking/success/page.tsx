"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  CheckCircle2,
  Copy,
  Calendar,
  Clock,
  MapPin,
  User,
  Scissors,
  Printer,
  Search,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("ref");
  const phone = searchParams.get("phone");

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (phone) {
      try {
        localStorage.setItem(
          "salon_customer_session",
          JSON.stringify({
            phone: phone.trim(),
            name: searchParams.get("name") || "Customer",
            loggedInAt: new Date().toISOString(),
          })
        );
        localStorage.setItem("last_booked_phone", phone.trim());
      } catch {}
    }

    if (!reference || !phone) {
      setLoading(false);
      return;
    }

    fetch("/api/bookings/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, phone }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.booking) {
          setBooking(data.booking);
        }
      })
      .finally(() => setLoading(false));
  }, [reference, phone, searchParams]);

  const copyToClipboard = () => {
    if (!reference) return;
    navigator.clipboard.writeText(reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B14] text-white">
      <PublicNavbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full space-y-8">
        {/* Success Banner */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Booking Confirmed!
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Your appointment has been recorded in the salon system. Save your reference code below to check status or reschedule.
          </p>

          {/* Reference Badge */}
          {reference && (
            <div className="pt-2">
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block text-left">
                    Booking Reference
                  </span>
                  <span className="text-lg font-mono font-black text-white tracking-wider">
                    {reference}
                  </span>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-colors"
                  title="Copy reference"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && (
                <p className="text-xs text-emerald-400 mt-1.5 font-medium">
                  Copied to clipboard!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Appointment Card */}
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            Loading booking details...
          </div>
        ) : booking ? (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-xl font-bold text-white">{booking.salon?.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{booking.branch?.name}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/20">
                {booking.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                <Calendar className="w-5 h-5 text-[#8B5CF6]" />
                <div>
                  <span className="text-[var(--text-muted)] block">Date & Time</span>
                  <span className="font-bold text-white text-sm">
                    {new Date(booking.bookingDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    at {booking.startTime}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                <User className="w-5 h-5 text-[#06B6D4]" />
                <div>
                  <span className="text-[var(--text-muted)] block">Stylist / Barber</span>
                  <span className="font-bold text-white text-sm">{booking.staff?.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                <MapPin className="w-5 h-5 text-[#EC4899]" />
                <div>
                  <span className="text-[var(--text-muted)] block">Branch Location</span>
                  <span className="font-bold text-white text-sm">{booking.branch?.address}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                <Scissors className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-[var(--text-muted)] block">Customer</span>
                  <span className="font-bold text-white text-sm">
                    {booking.customer?.name} ({booking.customer?.phone})
                  </span>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="pt-2 border-t border-white/[0.06] space-y-2">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Services Booked:
              </p>
              {booking.services?.map((bs: any) => (
                <div key={bs.id} className="flex justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">
                    {bs.service?.name} ({bs.service?.duration} mins)
                  </span>
                  <span className="font-bold text-white">LKR {bs.price?.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3">
              <Link
                href={`/customer/bookings?phone=${encodeURIComponent(phone || "")}${
                  reference ? `&ref=${encodeURIComponent(reference)}` : ""
                }`}
                className="flex-1 py-3 rounded-xl text-xs font-bold text-center bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-lg shadow-[#8B5CF6]/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>View in My Bookings</span>
              </Link>

              <Link
                href={`/booking/lookup?ref=${reference}&phone=${encodeURIComponent(phone || "")}`}
                className="flex-1 py-3 rounded-xl text-xs font-semibold text-center bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>Track Booking</span>
              </Link>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-3 px-4 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white border border-white/10 transition-colors flex items-center justify-center gap-2"
                title="Print Receipt"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>
        ) : null}

        <div className="text-center pt-4">
          <Link
            href="/booking"
            className="text-xs text-[var(--text-muted)] hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <span>Book another appointment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0A0B14] text-white">
          <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
