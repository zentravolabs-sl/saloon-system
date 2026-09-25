"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  Phone,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Scissors,
} from "lucide-react";

function CustomerLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryPhone = searchParams.get("phone");

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoCodeNotice, setDemoCodeNotice] = useState<string | null>(null);
  const [recentPhone, setRecentPhone] = useState<string | null>(null);

  useEffect(() => {
    if (queryPhone) {
      setPhone(queryPhone.trim());
      return;
    }

    try {
      const last = localStorage.getItem("last_booked_phone");
      if (last) {
        setRecentPhone(last);
        setPhone(last);
        return;
      }
      const saved = localStorage.getItem("salon_customer_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) {
          setRecentPhone(parsed.phone);
          setPhone(parsed.phone);
          if (parsed.name) setName(parsed.name);
        }
      }
    } catch {}
  }, [queryPhone]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!phone.trim()) {
      setError("Please enter your mobile number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), action: "send_otp" }),
      });
      const data = await res.json();

      if (res.ok) {
        setStep("otp");
        setDemoCodeNotice(data.code || "123456");
        setOtp(data.code || "123456"); // Pre-fill for frictionless UX
      } else {
        setError(data.error || "Failed to send verification code");
      }
    } catch {
      setError("Network error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otp.trim()) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          otp: otp.trim(),
          name: name.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (res.ok && data.customer) {
        // Save customer session in localStorage
        const activePhone = data.customer.phone || phone.trim();
        try {
          if (data.token) {
            localStorage.setItem("customer_auth_token", data.token);
          }
          localStorage.setItem(
            "salon_customer_session",
            JSON.stringify({
              phone: activePhone,
              name: data.customer.name,
              email: data.customer.email,
              loggedInAt: new Date().toISOString(),
            })
          );
          localStorage.setItem("last_booked_phone", activePhone);
        } catch {}
        router.push("/customer/bookings");
      } else {
        setError(data.error || "Invalid code. Please try 123456");
      }
    } catch {
      setError("Network error verifying code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B14] text-white">
      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md space-y-6">
          {/* Card */}
          <div className="p-8 rounded-3xl bg-[#0C0E1A] border border-white/10 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#8B5CF6]/15 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center mx-auto shadow-lg shadow-[#8B5CF6]/30">
                <Scissors className="w-7 h-7 text-white -rotate-45" />
              </div>
              <h1 className="text-2xl font-black text-white">Customer Portal</h1>
              <p className="text-xs text-[var(--text-secondary)]">
                {step === "phone"
                  ? "Enter your mobile number to view and manage your appointments"
                  : `Enter the 6-digit verification code sent to ${phone}`}
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {demoCodeNotice && step === "otp" && (
              <div className="p-3 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-xs text-[#A78BFA] flex items-center justify-between">
                <span>Demo Code: <strong>{demoCodeNotice}</strong></span>
                <span className="text-[10px] bg-[#8B5CF6]/20 px-2 py-0.5 rounded font-mono">Auto-filled</span>
              </div>
            )}

            {step === "phone" ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 077 123 4567 or +94 77 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                {/* Quick Selection Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Quick Fill:</span>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {recentPhone && (
                      <button
                        type="button"
                        onClick={() => setPhone(recentPhone)}
                        className="px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-300 font-mono"
                      >
                        Recent: {recentPhone}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPhone("+94771234102")}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300"
                    >
                      Chamara (+94771234102)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhone("+94771234100")}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300"
                    >
                      Harsha (+94771234100)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kasun Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-lg shadow-[#8B5CF6]/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Continue with Mobile</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    6-Digit OTP Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-[var(--text-muted)] text-center text-lg tracking-widest font-mono font-bold focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-lg shadow-[#8B5CF6]/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Access Appointments</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setError("");
                    }}
                    className="text-xs text-[var(--text-muted)] hover:text-white transition-colors"
                  >
                    Change mobile number
                  </button>
                </div>
              </form>
            )}

            <div className="pt-4 border-t border-white/10 text-center space-y-2 text-xs text-[var(--text-muted)]">
              <div>
                Looking for a single appointment?{" "}
                <Link
                  href="/booking/lookup"
                  className="text-[#A78BFA] hover:underline font-semibold"
                >
                  Instant Lookup
                </Link>
              </div>
              <div>
                Staff or Salon Owner?{" "}
                <Link
                  href="/auth/login"
                  className="text-white hover:underline font-semibold"
                >
                  Staff Portal Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0A0B14] text-white">
          <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
        </div>
      }
    >
      <CustomerLoginContent />
    </Suspense>
  );
}
