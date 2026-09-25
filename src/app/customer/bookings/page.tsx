"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Eye,
  FileText,
  Star,
  Plus,
  Loader2,
  ChevronRight,
  LogOut,
  Sparkles,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: {
    label: "Pending Confirmation",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  CONFIRMED: {
    label: "Confirmed",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  CHECKED_IN: {
    label: "Checked In",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  COMPLETED: {
    label: "Completed",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  REJECTED: {
    label: "Declined",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  NO_SHOW: {
    label: "No Show",
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    border: "border-zinc-500/30",
  },
};

function CustomerBookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryPhone = searchParams.get("phone");

  const [customerSession, setCustomerSession] = useState<any | null>(null);
  const [lastBookedPhone, setLastBookedPhone] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"ALL" | "UPCOMING" | "COMPLETED" | "CANCELLED">("ALL");

  // Phone switcher UI state
  const [showPhoneSwitcher, setShowPhoneSwitcher] = useState(false);
  const [switchInput, setSwitchInput] = useState("");

  useEffect(() => {
    // 1. Check if a phone parameter was provided in URL (?phone=...)
    if (queryPhone && queryPhone.trim()) {
      const activePhone = queryPhone.trim();
      const newSession = {
        phone: activePhone,
        name: "Customer",
        loggedInAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem("salon_customer_session", JSON.stringify(newSession));
      } catch {}
      setCustomerSession(newSession);
      fetchBookings(activePhone);
      checkLastBooked(activePhone);
      return;
    }

    // 2. Check local session
    const saved = localStorage.getItem("salon_customer_session");
    const lastBooked = localStorage.getItem("last_booked_phone");
    if (lastBooked) setLastBookedPhone(lastBooked);

    if (!saved && !lastBooked) {
      router.push("/customer/login");
      return;
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomerSession(parsed);
        fetchBookings(parsed.phone);
        checkLastBooked(parsed.phone);
      } catch {
        if (lastBooked) {
          switchToPhone(lastBooked);
        } else {
          router.push("/customer/login");
        }
      }
    } else if (lastBooked) {
      switchToPhone(lastBooked);
    }
  }, [queryPhone, router]);

  const checkLastBooked = (currentPhone: string) => {
    try {
      const last = localStorage.getItem("last_booked_phone");
      if (last && last.trim() !== currentPhone.trim()) {
        setLastBookedPhone(last.trim());
      } else {
        setLastBookedPhone(null);
      }
    } catch {}
  };

  const queryRef = searchParams.get("ref") || searchParams.get("reference");

  const fetchBookings = (phone: string, refOverride?: string) => {
    setLoading(true);
    const headers: Record<string, string> = {};
    try {
      const token = localStorage.getItem("customer_auth_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } catch {}
    const refParam = refOverride !== undefined ? refOverride : (queryRef || "");
    const url = `/api/customer/bookings?phone=${encodeURIComponent(phone)}${
      refParam ? `&reference=${encodeURIComponent(refParam)}` : ""
    }`;
    fetch(url, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.bookings) setBookings(data.bookings);
        else if (data.requiresAuth) {
          // Redirect to login if not authenticated
          router.push(`/customer/login?phone=${encodeURIComponent(phone)}`);
        }
      })
      .catch((err) => {
        console.error("Error fetching bookings:", err);
      })
      .finally(() => setLoading(false));
  };

  const switchToPhone = (targetPhone: string, targetName?: string) => {
    const cleaned = targetPhone.trim();
    if (!cleaned) return;

    const newSession = {
      phone: cleaned,
      name: targetName || customerSession?.name || "Customer",
      loggedInAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem("salon_customer_session", JSON.stringify(newSession));
    } catch {}
    setCustomerSession(newSession);
    setShowPhoneSwitcher(false);
    setSwitchInput("");
    checkLastBooked(cleaned);
    fetchBookings(cleaned);
  };

  const handleLogout = () => {
    localStorage.removeItem("salon_customer_session");
    router.push("/customer/login");
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterTab === "ALL") return true;
    if (filterTab === "UPCOMING") return ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(b.status);
    if (filterTab === "COMPLETED") return b.status === "COMPLETED";
    if (filterTab === "CANCELLED") return ["CANCELLED", "REJECTED", "NO_SHOW"].includes(b.status);
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B14] text-white">
      <PublicNavbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6">
        {/* Banner: Recent booking with another phone detected */}
        {lastBookedPhone && lastBookedPhone !== customerSession?.phone && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-600/20 via-pink-600/20 to-purple-600/20 border border-violet-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
              <span>
                Recent booking detected for mobile <strong className="text-white font-mono">{lastBookedPhone}</strong>. Currently viewing <span className="text-zinc-400">{customerSession?.phone}</span>.
              </span>
            </div>
            <button
              onClick={() => switchToPhone(lastBookedPhone)}
              className="px-4 py-2 rounded-xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white hover:brightness-110 active:scale-95 transition-all shrink-0 text-center"
            >
              Switch to {lastBookedPhone}
            </button>
          </div>
        )}

        {/* Customer Header Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0C0E1A] via-[#111428] to-[#0C0E1A] border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#8B5CF6]/10 blur-3xl pointer-events-none" />

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30">
                Customer Portal
              </span>
              <span className="text-xs font-mono font-semibold text-white/80 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                {customerSession?.phone || "No phone"}
              </span>
              <button
                onClick={() => setShowPhoneSwitcher(!showPhoneSwitcher)}
                className="text-xs text-pink-400 hover:text-pink-300 underline font-medium ml-1 transition-colors"
              >
                {showPhoneSwitcher ? "Cancel" : "Change Mobile"}
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Welcome back, {customerSession?.name || "Customer"}!
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              View your booking history, upcoming visits, invoices, and leave reviews for your stylists.
            </p>

            {/* Inline Phone Switcher Input */}
            {showPhoneSwitcher && (
              <div className="pt-3 max-w-md">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (switchInput.trim()) switchToPhone(switchInput);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="e.g. 0779876543 or +94771234567"
                      value={switchInput}
                      onChange={(e) => setSwitchInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white/10 border border-white/20 text-white placeholder-zinc-500 focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#8B5CF6] hover:bg-[#7c4df0] text-white transition-colors"
                  >
                    View
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => fetchBookings(customerSession?.phone)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
              title="Refresh Bookings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#8B5CF6]" : ""}`} />
            </button>

            <Link
              href="/booking"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-lg shadow-[#8B5CF6]/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </Link>

            <Link
              href="/customer/profile"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
            >
              My Profile
            </Link>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 border border-white/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 text-xs">
          {[
            { id: "ALL", label: "All Bookings", count: bookings.length },
            {
              id: "UPCOMING",
              label: "Upcoming",
              count: bookings.filter((b) =>
                ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(b.status)
              ).length,
            },
            {
              id: "COMPLETED",
              label: "Completed",
              count: bookings.filter((b) => b.status === "COMPLETED").length,
            },
            {
              id: "CANCELLED",
              label: "Cancelled / No-Show",
              count: bookings.filter((b) =>
                ["CANCELLED", "REJECTED", "NO_SHOW"].includes(b.status)
              ).length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 ${
                filterTab === tab.id
                  ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30"
                  : "bg-white/[0.03] text-[var(--text-secondary)] hover:text-white hover:bg-white/5 border border-white/5"
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="py-24 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            <span>Loading appointments for {customerSession?.phone}...</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-3xl bg-white/[0.02] border border-white/10 space-y-6 max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center mx-auto text-[#A78BFA]">
              <Calendar className="w-7 h-7" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No Bookings Found</h3>
              <p className="text-xs text-[var(--text-muted)]">
                No appointments found for mobile <strong className="text-white font-mono">{customerSession?.phone}</strong> under &quot;{filterTab.toLowerCase()}&quot;.
              </p>
            </div>

            {/* Quick Phone Switch Form in Empty State */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-3">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>Booked with a different mobile number?</span>
              </span>
              <p className="text-[11px] text-[var(--text-secondary)]">
                If you made a booking using another phone format (e.g. starting with 07X or +94), enter it below to display your appointments immediately:
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (switchInput.trim()) switchToPhone(switchInput);
                }}
                className="flex flex-col sm:flex-row items-center gap-2 pt-1"
              >
                <div className="relative w-full">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="e.g. 0779876543 or 0775545456"
                    value={switchInput}
                    onChange={(e) => setSwitchInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-black/40 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shrink-0 hover:brightness-110 transition-all"
                >
                  Find My Bookings
                </button>
              </form>
            </div>

            <div className="pt-2">
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10"
              >
                <Plus className="w-4 h-4" />
                <span>Book New Appointment</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredBookings.map((b) => {
              const statusCfg = STATUS_CONFIG[b.status] || {
                label: b.status,
                bg: "bg-white/10",
                text: "text-white",
                border: "border-white/20",
              };

              return (
                <div
                  key={b.id}
                  className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-mono text-xs font-black text-[#A78BFA]">
                          {b.reference}
                        </span>
                        <h3 className="text-lg font-bold text-white mt-0.5">
                          {b.salon.name}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                          <span>{b.branch.name} • {b.branch.city || b.branch.address}</span>
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Appointment Details */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white font-medium">
                          <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span>{new Date(b.bookingDate).toISOString().split("T")[0]}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white font-medium">
                          <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span>{b.startTime} - {b.endTime}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[var(--text-secondary)] pt-1 border-t border-white/5">
                        <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>Stylist: <strong className="text-white">{b.staff?.name || "Unassigned"}</strong></span>
                      </div>
                    </div>

                    {/* Services Breakdown */}
                    <div className="space-y-1.5 text-xs">
                      <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                        Services Booked
                      </span>
                      <div className="space-y-1">
                        {b.services?.map((bs: any) => (
                          <div
                            key={bs.id}
                            className="flex items-center justify-between text-white/90"
                          >
                            <span>{bs.service.name} ({bs.duration}m)</span>
                            <span className="font-semibold">Rs. {bs.price.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between font-bold text-white text-sm">
                        <span>Total Amount</span>
                        <span className="text-emerald-400">Rs. {b.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                    <Link
                      href={`/customer/bookings/${b.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </Link>

                    {b.status === "COMPLETED" && (
                      <Link
                        href={`/customer/bookings/${b.id}#invoice`}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#8B5CF6]/20 text-[#A78BFA] hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/30 transition-colors flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Receipt / Invoice</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}

export default function CustomerBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0A0B14] text-white">
          <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
        </div>
      }
    >
      <CustomerBookingsContent />
    </Suspense>
  );
}
