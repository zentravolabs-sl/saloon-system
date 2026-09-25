"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  Scissors,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Building2,
  Smartphone,
  UserCheck,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";

  const [activeTab, setActiveTab] = useState<"admin" | "customer">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (loginEmail = email, loginPass = password) => {
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: loginEmail,
        password: loginPass,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email address or password.");
      } else {
        // Redirect based on role or callbackUrl
        if (callbackUrl) {
          router.push(callbackUrl);
        } else if (loginEmail === "admin@zentravo.com") {
          router.push("/super-admin/dashboard");
        } else {
          router.push("/admin/dashboard");
        }
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Admin@123");
    handleLogin(demoEmail, "Admin@123");
  };

  const handleQuickCustomerDemo = () => {
    // Save session in localStorage and redirect directly to customer bookings
    localStorage.setItem(
      "salon_customer_session",
      JSON.stringify({
        phone: "+94771234567",
        name: "Kasun Perera (Demo Customer)",
        email: "kasun.demo@gmail.com",
        loggedInAt: new Date().toISOString(),
      })
    );
    router.push("/customer/bookings");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080911] text-white selection:bg-violet-500/30">
      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <Scissors className="w-6 h-6 transform -rotate-45" />
            </div>
            <h1 className="font-heading text-2xl font-black text-white tracking-tight">
              {activeTab === "admin" ? "Sign In to Your Salon" : "Customer Access Portal"}
            </h1>
            <p className="text-xs text-zinc-400">
              {activeTab === "admin"
                ? "Access your salon owner, staff, or super-admin management portal."
                : "Look up appointments, download receipts, and manage loyalty points."}
            </p>
          </div>

          {/* Portal Switcher Tabs */}
          <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#111322] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "admin"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/25"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Salon & Staff Portal</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("customer")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "customer"
                  ? "bg-pink-600 text-white shadow-md shadow-pink-600/25"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Customer Portal</span>
            </button>
          </div>

          {activeTab === "customer" ? (
            /* Customer Portal Quick View */
            <div className="p-6 rounded-3xl bg-[#111322] border border-white/[0.08] space-y-5">
              <div className="space-y-2 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 text-pink-300 text-xs font-bold border border-pink-500/20">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile OTP Login</span>
                </span>
                <h3 className="font-heading text-lg font-bold text-white">
                  Customer Appointment Ledger
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Log in with your mobile phone number to view all your upcoming bookings, history, and loyalty points across all partner salons.
                </p>
              </div>

              {/* 1-Click Demo Customer Button */}
              <button
                type="button"
                onClick={handleQuickCustomerDemo}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-600 to-violet-600 text-white shadow-lg shadow-pink-600/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>1-Click Demo Customer Login (+94771234567)</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-white/[0.06] w-full" />
                <span className="bg-[#111322] px-3 text-[11px] text-zinc-500 uppercase font-semibold">
                  Or
                </span>
              </div>

              <div className="space-y-3">
                <Link
                  href="/customer/login"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] transition-colors flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                  <span>Enter Custom Mobile Number with OTP →</span>
                </Link>
                <Link
                  href="/booking/lookup"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] transition-colors flex items-center justify-center gap-2"
                >
                  <span>Quick Reference Code Lookup (No Login) →</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Staff & Salon Admin Portal */
            <>
              {/* Quick Demo Login Buttons */}
              <div className="p-4 rounded-3xl bg-[#111322] border border-white/[0.08] space-y-2.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  1-Click Demo Admin Logins
                </span>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("admin@zentravo.com")}
                    className="w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-white flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-violet-400" />
                      <span className="font-bold">Super Admin Portal</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono">admin@zentravo.com</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo("rajesh@glamourcuts.lk")}
                    className="w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-white flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-pink-400" />
                      <span className="font-bold">Glamour Cuts Owner</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono">rajesh@glamourcuts.lk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo("malith@stylezone.lk")}
                    className="w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-white flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold">Style Zone Owner</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono">malith@stylezone.lk</span>
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 rounded-3xl bg-[#111322] border border-white/[0.08] space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLogin();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. rajesh@glamourcuts.lk"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-heading font-bold text-xs bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-600/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Sign In to Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-4 border-t border-white/[0.06] text-center text-xs text-zinc-400">
                  New Salon Owner?{" "}
                  <Link
                    href="/auth/register"
                    className="text-violet-300 hover:text-white font-semibold transition-colors"
                  >
                    Register Your Salon
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#080911] text-white">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
