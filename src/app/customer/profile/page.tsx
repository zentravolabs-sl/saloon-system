"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  User,
  Phone,
  Mail,
  Award,
  Calendar,
  DollarSign,
  ChevronLeft,
  Loader2,
  Save,
  CheckCircle2,
  LogOut,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export default function CustomerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Form edit state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("salon_customer_session");
    if (!saved) {
      router.push("/customer/login");
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      fetchProfile(parsed.phone);
    } catch {
      router.push("/customer/login");
    }
  }, [router]);

  const fetchProfile = (phone: string) => {
    setLoading(true);
    fetch(`/api/customer/profile?phone=${encodeURIComponent(phone)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setName(data.profile.name || "");
          setEmail(data.profile.email || "");
        }
      })
      .finally(() => setLoading(false));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setSaveSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: profile.phone,
          name: name.trim(),
          email: email.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        // update local storage
        const saved = localStorage.getItem("salon_customer_session");
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.name = name;
          parsed.email = email;
          localStorage.setItem("salon_customer_session", JSON.stringify(parsed));
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update profile");
      }
    } catch {
      setError("Network error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("salon_customer_session");
    router.push("/customer/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B14] text-white">
      <PublicNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/customer/bookings"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Appointments</span>
          </Link>

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 border border-white/10 transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {loading ? (
          <div className="py-24 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            <span>Loading customer profile...</span>
          </div>
        ) : !profile ? (
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 text-center">
            <p className="text-xs text-[var(--text-muted)]">Profile not found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#0C0E1A] border border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA] shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-[var(--text-muted)]">Total Bookings</span>
                  <h3 className="text-xl font-bold text-white">{profile.totalBookings}</h3>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0C0E1A] border border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-[var(--text-muted)]">Total Spent</span>
                  <h3 className="text-xl font-bold text-white">
                    Rs. {profile.totalSpent.toLocaleString()}
                  </h3>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0C0E1A] border border-amber-500/30 bg-gradient-to-tr from-[#0C0E1A] to-amber-500/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-amber-300 font-semibold">Loyalty Rewards</span>
                  <h3 className="text-xl font-bold text-white">
                    {profile.totalPoints} <span className="text-xs font-normal text-[var(--text-muted)]">pts</span>
                  </h3>
                </div>
              </div>
            </div>

            {/* Profile Edit Form */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0C0E1A] border border-white/10 space-y-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#8B5CF6]" />
                Personal Information
              </h2>

              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[var(--text-secondary)] font-medium">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[var(--text-secondary)] font-medium">Mobile Number</label>
                    <input
                      type="tel"
                      disabled
                      value={profile.phone}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[var(--text-muted)] cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[var(--text-secondary)] font-medium">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Loyalty Transactions Ledger (Section 43) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    Loyalty Rewards Points Ledger
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Earn 1 point for every Rs. 100 spent. Redeem points on upcoming bookings.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-amber-400">
                  {profile.totalPoints} Points Active
                </span>
              </div>

              {profile.recentTransactions?.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                  No loyalty points transactions yet. Complete bookings to earn reward points.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {profile.recentTransactions?.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-white block">
                          {t.description || "Booking reward"}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {t.salonName} • {new Date(t.createdAt).toISOString().split("T")[0]}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          t.points >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {t.points >= 0 ? `+${t.points}` : t.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
