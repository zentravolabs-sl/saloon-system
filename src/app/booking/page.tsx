"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  Scissors,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  Tag,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  Loader2,
  Building2,
  Search,
  Navigation,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SalonBranch {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
}

interface Salon {
  id: string;
  name: string;
  city: string | null;
  slug: string;
  description?: string | null;
  branches: SalonBranch[];
  _count: { staff: number };
}

interface Branch {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  bufferTime: number;
  category?: { name: string };
}

interface Staff {
  id: string;
  name: string;
  specialization?: string | null;
  photo?: string | null;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

// ─── STEP LABELS ───────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: "Location" },
  { num: 2, label: "Salon" },
  { num: 3, label: "Branch" },
  { num: 4, label: "Services" },
  { num: 5, label: "Barber" },
  { num: 6, label: "Date & Time" },
  { num: 7, label: "Confirm" },
];

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

function BookingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preSalonId = searchParams.get("salonId") || "";
  const preBranchId = searchParams.get("branchId") || "";
  const preServiceId = searchParams.get("serviceId") || "";
  const preStaffId = searchParams.get("staffId") || "";

  const [currentStep, setCurrentStep] = useState(1);

  // Location
  const [selectedCity, setSelectedCity] = useState<string>(""); // "" = All
  const [citySearch, setCitySearch] = useState("");

  // Selections
  const [selectedSalonId, setSelectedSalonId] = useState(preSalonId);
  const [selectedBranchId, setSelectedBranchId] = useState(preBranchId);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState(preStaffId);
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  // Customer Form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Data lists
  const [salons, setSalons] = useState<Salon[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [slotError, setSlotError] = useState<string>("");

  // Loading
  const [loadingSalons, setLoadingSalons] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Fetch approved salons + derive city list ─────────────────────────────
  useEffect(() => {
    fetch("/api/salons?status=APPROVED&limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.salons) {
          setSalons(data.salons);
          // Build unique city list from salon.city + branch.city
          const citySet = new Set<string>();
          data.salons.forEach((s: Salon) => {
            if (s.city) citySet.add(s.city);
            s.branches?.forEach((b) => {
              if (b.city) citySet.add(b.city);
            });
          });
          setCities(Array.from(citySet).sort());

          // Auto-select if pre-selected
          if (preSalonId) {
            setCurrentStep(3); // jump to branch step
          }
        }
      })
      .finally(() => setLoadingSalons(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch branches when salon selected ──────────────────────────────────
  useEffect(() => {
    if (!selectedSalonId) return;
    setLoadingBranches(true);
    fetch(`/api/branches?salonId=${selectedSalonId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.branches) {
          setBranches(data.branches);
          if (
            preBranchId &&
            data.branches.some((b: Branch) => b.id === preBranchId)
          ) {
            setSelectedBranchId(preBranchId);
          } else if (data.branches.length === 1) {
            setSelectedBranchId(data.branches[0].id);
          } else {
            setSelectedBranchId("");
          }
        }
      })
      .finally(() => setLoadingBranches(false));
  }, [selectedSalonId]);

  // ── Fetch services when branch selected ─────────────────────────────────
  useEffect(() => {
    if (!selectedSalonId) return;
    setLoadingServices(true);
    const url = selectedBranchId
      ? `/api/services?salonId=${selectedSalonId}&branchId=${selectedBranchId}`
      : `/api/services?salonId=${selectedSalonId}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.services) {
          setServices(data.services);
          if (preServiceId) {
            const found = data.services.find(
              (s: Service) => s.id === preServiceId
            );
            if (found) setSelectedServices([found]);
          }
        }
      })
      .finally(() => setLoadingServices(false));
  }, [selectedSalonId, selectedBranchId]);

  // ── Fetch staff for branch ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSalonId || !selectedBranchId) return;
    setLoadingStaff(true);
    fetch(`/api/staff?salonId=${selectedSalonId}&branchId=${selectedBranchId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.staff) {
          setStaffList(data.staff);
          if (
            preStaffId &&
            data.staff.some((s: Staff) => s.id === preStaffId)
          ) {
            setSelectedStaffId(preStaffId);
          } else if (data.staff.length > 0 && !selectedStaffId) {
            setSelectedStaffId(data.staff[0].id);
          }
        }
      })
      .finally(() => setLoadingStaff(false));
  }, [selectedSalonId, selectedBranchId]);

  // ── Fetch slots ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      !selectedBranchId ||
      !selectedStaffId ||
      selectedServices.length === 0 ||
      !selectedDate
    ) {
      setAvailableSlots([]);
      return;
    }

    setLoadingSlots(true);
    setSlotError("");
    setSelectedSlot("");

    const serviceIdsParam = selectedServices.map((s) => s.id).join(",");
    const url = `/api/availability?branchId=${selectedBranchId}&staffId=${selectedStaffId}&serviceIds=${serviceIdsParam}&date=${selectedDate}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setSlotError(data.error);
          setAvailableSlots([]);
        } else if (data.slots) {
          setAvailableSlots(data.slots);
          if (data.slots.length === 0) {
            setSlotError(
              "No available time slots for this date and staff member."
            );
          }
        }
      })
      .catch(() =>
        setSlotError(
          "Unable to calculate availability. Please try another date."
        )
      )
      .finally(() => setLoadingSlots(false));
  }, [selectedBranchId, selectedStaffId, selectedServices, selectedDate]);

  // ── Derived values ───────────────────────────────────────────────────────
  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.duration + s.bufferTime,
    0
  );
  const subtotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const discountAmount = couponApplied ? couponApplied.discount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Filtered salons based on selectedCity
  const filteredSalons = selectedCity
    ? salons.filter(
        (s) =>
          s.city?.toLowerCase() === selectedCity.toLowerCase() ||
          s.branches?.some(
            (b) => b.city?.toLowerCase() === selectedCity.toLowerCase()
          )
      )
    : salons;

  const selectedSalon = salons.find((s) => s.id === selectedSalonId);
  const selectedBranch = branches.find((b) => b.id === selectedBranchId);
  const selectedStaff = staffList.find((st) => st.id === selectedStaffId);

  // Branches filtered by selected city (for step 3)
  const filteredBranches = selectedCity
    ? branches.filter(
        (b) => !b.city || b.city.toLowerCase() === selectedCity.toLowerCase()
      )
    : branches;

  // city search
  const filteredCities = citySearch
    ? cities.filter((c) =>
        c.toLowerCase().includes(citySearch.toLowerCase())
      )
    : cities;

  const toggleService = useCallback((srv: Service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === srv.id);
      return exists ? prev.filter((s) => s.id !== srv.id) : [...prev, srv];
    });
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          salonId: selectedSalonId,
          totalAmount: subtotal,
        }),
      });
      const data = await res.json();
      if (!data.valid) {
        setCouponError(data.error || "Invalid coupon code");
        setCouponApplied(null);
      } else {
        setCouponApplied({
          code: data.coupon.code,
          discount: data.coupon.calculatedDiscount,
        });
      }
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSubmitBooking = async () => {
    setSubmitError("");
    if (!customerName.trim() || !customerPhone.trim()) {
      setSubmitError("Please provide your full name and mobile phone number.");
      return;
    }
    if (!selectedSlot) {
      setSubmitError("Please select an appointment time slot.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranchId,
          staffId: selectedStaffId,
          serviceIds: selectedServices.map((s) => s.id),
          bookingDate: selectedDate,
          startTime: selectedSlot,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          customerNotes: customerNotes.trim() || undefined,
          couponCode: couponApplied ? couponApplied.code : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(
          data.error || "Failed to confirm booking. Please try another slot."
        );
        if (res.status === 409) setCurrentStep(6);
      } else {
        const ref = data.booking.reference;
        try {
          if (data.customerToken) {
            localStorage.setItem("customer_auth_token", data.customerToken);
          }
          localStorage.setItem(
            "salon_customer_session",
            JSON.stringify({
              phone: customerPhone.trim(),
              name: customerName.trim(),
              email: customerEmail.trim() || undefined,
              loggedInAt: new Date().toISOString(),
            })
          );
          localStorage.setItem("last_booked_phone", customerPhone.trim());
          localStorage.setItem("last_booked_name", customerName.trim());
        } catch {}

        router.push(
          `/booking/success?ref=${ref}&name=${encodeURIComponent(
            customerName
          )}&phone=${encodeURIComponent(customerPhone)}`
        );
      }
    } catch {
      setSubmitError("Network error while creating booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────

  const goBack = () => setCurrentStep((s) => Math.max(1, s - 1));
  const goNext = () => setCurrentStep((s) => Math.min(7, s + 1));

  const btnPrimary =
    "px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-lg shadow-[#8B5CF6]/30 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2";
  const btnBack =
    "px-5 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-white hover:bg-white/5 border border-white/10 transition-colors flex items-center gap-1.5";

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0B14] text-white">
      <PublicNavbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">

        {/* ─── Hero Header ───────────────────────────────────── */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/10 text-[#A78BFA] text-xs font-semibold border border-[#8B5CF6]/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Reservation Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Book Your Appointment
          </h1>
          <p className="text-[var(--text-secondary)] text-sm max-w-xl mx-auto">
            Filter by your area → pick a salon → choose branch, services,
            stylist, date &amp; time.
          </p>

          {/* Stepper */}
          <div className="pt-4 max-w-3xl mx-auto overflow-x-auto">
            <div className="flex items-center justify-between min-w-[520px]">
              {STEPS.map((step, idx) => (
                <div key={step.num} className="flex items-center">
                  <button
                    onClick={() => {
                      if (step.num < currentStep) setCurrentStep(step.num);
                    }}
                    disabled={step.num > currentStep}
                    className={`flex items-center gap-1.5 text-[11px] font-bold transition-all ${
                      currentStep === step.num
                        ? "text-white"
                        : currentStep > step.num
                        ? "text-emerald-400 cursor-pointer"
                        : "text-[var(--text-muted)] cursor-not-allowed"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        currentStep === step.num
                          ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/40"
                          : currentStep > step.num
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-white/5 text-[var(--text-muted)] border border-white/10"
                      }`}
                    >
                      {currentStep > step.num ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        step.num
                      )}
                    </div>
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`w-4 sm:w-8 h-0.5 mx-1 rounded-full ${
                        currentStep > step.num
                          ? "bg-emerald-500/50"
                          : "bg-white/10"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ╔═══════════════════════════════════════════════════════╗
            ║  STEP 1 — LOCATION FILTER                            ║
            ╚═══════════════════════════════════════════════════════╝ */}
        {currentStep === 1 && (
          <div className="space-y-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 sm:p-8 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#8B5CF6]" />
                Select Your Area
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Choose your city or district to see nearby salons. You can skip
                this to see all salons.
              </p>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search city / district..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            {/* City chips */}
            {loadingSalons ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                Loading locations...
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {/* "All" chip */}
                <button
                  type="button"
                  onClick={() => setSelectedCity("")}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                    selectedCity === ""
                      ? "bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30"
                      : "bg-white/[0.04] border-white/10 text-[var(--text-secondary)] hover:border-white/20 hover:text-white"
                  }`}
                >
                  🌍 All Areas
                </button>

                {filteredCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedCity(city)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                      selectedCity === city
                        ? "bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30"
                        : "bg-white/[0.04] border-white/10 text-[var(--text-secondary)] hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    {city}
                  </button>
                ))}

                {filteredCities.length === 0 && citySearch && (
                  <p className="text-xs text-[var(--text-muted)]">
                    No city found for &quot;{citySearch}&quot;
                  </p>
                )}
              </div>
            )}

            {/* Info */}
            {selectedCity && (
              <div className="flex items-center gap-2 text-xs text-[#A78BFA] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 px-4 py-2.5 rounded-xl">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Showing salons in{" "}
                  <strong className="text-white">{selectedCity}</strong> —{" "}
                  {filteredSalons.length} salon
                  {filteredSalons.length !== 1 ? "s" : ""} found
                </span>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                disabled={loadingSalons}
                onClick={goNext}
                className={btnPrimary}
              >
                <span>
                  {selectedCity
                    ? `View Salons in ${selectedCity}`
                    : "View All Salons"}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ╔═══════════════════════════════════════════════════════╗
            ║  STEP 2 — SALON SELECTION                            ║
            ╚═══════════════════════════════════════════════════════╝ */}
        {currentStep === 2 && (
          <div className="space-y-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 sm:p-8 animate-fadeIn">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#8B5CF6]" />
                  Select Salon
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {selectedCity
                    ? `Salons available in ${selectedCity}`
                    : "All partner salons"}
                  {" — "}
                  {filteredSalons.length} found
                </p>
              </div>
              {selectedCity && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#A78BFA] text-[11px] font-bold">
                  <MapPin className="w-3 h-3" />
                  {selectedCity}
                </span>
              )}
            </div>

            {loadingSalons ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                Loading salons...
              </div>
            ) : filteredSalons.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-sm text-amber-400">
                  No salons found{selectedCity ? ` in ${selectedCity}` : ""}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCity("");
                    setCurrentStep(1);
                  }}
                  className="text-xs text-[#A78BFA] underline"
                >
                  Clear location filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredSalons.map((salon) => {
                  // Show branches relevant to selected city
                  const displayBranches = selectedCity
                    ? salon.branches.filter(
                        (b) =>
                          b.city?.toLowerCase() ===
                          selectedCity.toLowerCase()
                      )
                    : salon.branches.slice(0, 3);

                  return (
                    <button
                      key={salon.id}
                      type="button"
                      onClick={() => {
                        setSelectedSalonId(salon.id);
                        setSelectedServices([]);
                        setSelectedStaffId("");
                        setSelectedBranchId("");
                        goNext();
                      }}
                      className={`p-5 rounded-2xl border text-left transition-all group ${
                        selectedSalonId === salon.id
                          ? "bg-[#8B5CF6]/15 border-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/20"
                          : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-white font-black text-base shrink-0">
                            {salon.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white group-hover:text-[#A78BFA] transition-colors">
                              {salon.name}
                            </p>
                            {salon.city && (
                              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" />
                                {salon.city}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] bg-white/5 border border-white/10 rounded-lg px-2 py-1 shrink-0">
                          <Building2 className="w-3 h-3" />
                          {salon.branches.length} branch
                          {salon.branches.length !== 1 ? "es" : ""}
                        </div>
                      </div>

                      {salon.description && (
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">
                          {salon.description}
                        </p>
                      )}

                      {displayBranches.length > 0 && (
                        <div className="space-y-1">
                          {displayBranches.map((b) => (
                            <div
                              key={b.id}
                              className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]"
                            >
                              <MapPin className="w-3 h-3 text-[#EC4899] shrink-0" />
                              <span className="text-white/70">{b.name}</span>
                              {b.city && (
                                <span className="text-[var(--text-muted)]">
                                  · {b.city}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {salon._count.staff} stylists
                        </span>
                        <span className="text-xs font-bold text-[#A78BFA] flex items-center gap-1">
                          Select <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-4 flex justify-between">
              <button type="button" onClick={goBack} className={btnBack}>
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        )}

        {/* ╔═══════════════════════════════════════════════════════╗
            ║  STEP 3 — BRANCH SELECTION                           ║
            ╚═══════════════════════════════════════════════════════╝ */}
        {currentStep === 3 && (
          <div className="space-y-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 sm:p-8 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#EC4899]" />
                Select Branch
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Choose the closest branch of{" "}
                <strong className="text-white">{selectedSalon?.name}</strong>
                {selectedCity && ` near ${selectedCity}`}.
              </p>
            </div>

            {loadingBranches ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                Loading branches...
              </div>
            ) : filteredBranches.length === 0 ? (
              <p className="text-xs text-amber-400 py-4">
                No active branches found
                {selectedCity ? ` in ${selectedCity}` : ""} for this salon.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredBranches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => {
                      setSelectedBranchId(branch.id);
                      goNext();
                    }}
                    className={`p-5 rounded-2xl border text-left transition-all ${
                      selectedBranchId === branch.id
                        ? "bg-[#EC4899]/15 border-[#EC4899] shadow-lg shadow-[#EC4899]/20"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm text-white">
                        {branch.name}
                      </p>
                      {selectedBranchId === branch.id && (
                        <CheckCircle2 className="w-4 h-4 text-[#EC4899]" />
                      )}
                    </div>
                    {branch.address && (
                      <p className="text-xs text-[var(--text-muted)] flex items-start gap-1.5">
                        <MapPin className="w-3 h-3 text-[#EC4899] mt-0.5 shrink-0" />
                        {branch.address}
                      </p>
                    )}
                    {branch.city && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#A78BFA] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 px-2.5 py-1 rounded-full">
                        <MapPin className="w-2.5 h-2.5" />
                        {branch.city}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Show all branches if filtered is smaller */}
            {selectedCity && filteredBranches.length < branches.length && (
              <p className="text-xs text-[var(--text-muted)]">
                {branches.length - filteredBranches.length} branch
                {branches.length - filteredBranches.length !== 1 ? "es" : ""}{" "}
                outside {selectedCity}.{" "}
                <button
                  type="button"
                  onClick={() => setSelectedCity("")}
                  className="text-[#A78BFA] underline"
                >
                  Show all branches
                </button>
              </p>
            )}

            <div className="pt-4 flex justify-between">
              <button type="button" onClick={goBack} className={btnBack}>
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!selectedBranchId}
                onClick={goNext}
                className={btnPrimary}
              >
                <span>Continue to Services</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ╔═══════════════════════════════════════════════════════╗
            ║  STEP 4 — SERVICE SELECTION                          ║
            ╚═══════════════════════════════════════════════════════╝ */}
        {currentStep === 4 && (
          <div className="space-y-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 sm:p-8 animate-fadeIn">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-[#EC4899]" />
                  Select Services
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Pick one or more treatments (e.g. Haircut + Beard Trim).
                </p>
              </div>
              {selectedServices.length > 0 && (
                <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white flex items-center gap-3">
                  <span>
                    <strong>{selectedServices.length}</strong> selected
                  </span>
                  <span>•</span>
                  <span>{totalDuration} mins</span>
                  <span>•</span>
                  <span className="text-[#A78BFA] font-bold">
                    LKR {subtotal.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {loadingServices ? (
              <div className="py-12 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                Loading service menu...
              </div>
            ) : services.length === 0 ? (
              <p className="text-xs text-amber-400 py-6">
                No services available for this branch.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map((service) => {
                  const isSelected = selectedServices.some(
                    (s) => s.id === service.id
                  );
                  return (
                    <div
                      key={service.id}
                      onClick={() => toggleService(service)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                        isSelected
                          ? "bg-[#8B5CF6]/15 border-[#8B5CF6] shadow-md shadow-[#8B5CF6]/20"
                          : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">
                            {service.name}
                          </span>
                          {service.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-[var(--text-muted)]">
                              {service.category.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          <Clock className="w-3.5 h-3.5 text-[#06B6D4]" />
                          <span>{service.duration} mins</span>
                          {service.bufferTime > 0 && (
                            <span>(+{service.bufferTime}m buffer)</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <span className="font-bold text-sm text-white">
                          LKR {service.price.toLocaleString()}
                        </span>
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors ${
                            isSelected
                              ? "bg-[#8B5CF6] border-[#8B5CF6] text-white"
                              : "border-white/20 bg-white/5 text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-6 flex items-center justify-between">
              <button type="button" onClick={goBack} className={btnBack}>
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={selectedServices.length === 0}
                onClick={goNext}
                className={btnPrimary}
              >
                <span>Continue to Barber</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ╔═══════════════════════════════════════════════════════╗
            ║  STEP 5 — BARBER / STYLIST SELECTION                ║
            ╚═══════════════════════════════════════════════════════╝ */}
        {currentStep === 5 && (
          <div className="space-y-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 sm:p-8 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-[#06B6D4]" />
                Select Barber / Stylist
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Choose your preferred barber or stylist at{" "}
                <strong className="text-white">{selectedBranch?.name}</strong>.
              </p>
            </div>

            {loadingStaff ? (
              <div className="py-12 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                Finding available stylists...
              </div>
            ) : staffList.length === 0 ? (
              <p className="text-xs text-amber-400 py-6">
                No staff members found for this branch.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {staffList.map((staff) => (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => setSelectedStaffId(staff.id)}
                    className={`p-5 rounded-2xl border text-center transition-all ${
                      selectedStaffId === staff.id
                        ? "bg-[#06B6D4]/15 border-[#06B6D4] shadow-lg shadow-[#06B6D4]/20"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#06B6D4] mx-auto flex items-center justify-center text-white font-black text-lg mb-3 shadow-md">
                      {staff.name.charAt(0)}
                    </div>
                    <h3 className="font-bold text-sm text-white">
                      {staff.name}
                    </h3>
                    <p className="text-xs text-[#22D3EE] font-medium mt-0.5">
                      {staff.specialization || "Professional Stylist"}
                    </p>
                    {selectedStaffId === staff.id && (
                      <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-[#22D3EE] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Selected</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="pt-6 flex items-center justify-between">
              <button type="button" onClick={goBack} className={btnBack}>
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!selectedStaffId}
                onClick={goNext}
                className={btnPrimary}
              >
                <span>Select Date &amp; Time</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ╔═══════════════════════════════════════════════════════╗
            ║  STEP 6 — DATE & TIME                                ║
            ╚═══════════════════════════════════════════════════════╝ */}
        {currentStep === 6 && (
          <div className="space-y-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 sm:p-8 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#8B5CF6]" />
                Select Date &amp; Verified Time Slot
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Slots are calculated in real-time according to branch hours,
                staff schedules, leaves, and treatment duration ({totalDuration}{" "}
                mins).
              </p>
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Appointment Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-64 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            {/* Slots */}
            <div className="space-y-3 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Available Slots for {selectedDate}
                </label>
                {selectedSlot && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {selectedSlot}
                  </span>
                )}
              </div>

              {loadingSlots ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                  Checking branch schedule, breaks &amp; leaves...
                </div>
              ) : slotError ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{slotError}</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--text-muted)] bg-white/[0.01] rounded-xl border border-white/5">
                  No slots available on this date. Please choose another date.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.startTime)}
                        className={`py-3 px-2 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-lg shadow-[#8B5CF6]/30 scale-105"
                            : slot.available
                            ? "bg-white/[0.04] border border-white/10 text-white hover:border-[#8B5CF6] hover:bg-white/10"
                            : "bg-white/[0.01] border border-white/5 text-white/20 cursor-not-allowed line-through"
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-6 flex items-center justify-between">
              <button type="button" onClick={goBack} className={btnBack}>
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!selectedSlot}
                onClick={goNext}
                className={btnPrimary}
              >
                <span>Continue to Details</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ╔═══════════════════════════════════════════════════════╗
            ║  STEP 7 — CUSTOMER DETAILS & CONFIRMATION            ║
            ╚═══════════════════════════════════════════════════════╝ */}
        {currentStep === 7 && (
          <div className="space-y-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 sm:p-8 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Review &amp; Confirm
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Enter your contact info to receive a booking confirmation. No
                registration required.
              </p>
            </div>

            {submitError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left — Contact inputs */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Contact Information
                </h3>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kasun Silva"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Mobile Number <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +94771234567"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Email Address (optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="email"
                      placeholder="e.g. kasun@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Special Requests (optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Please keep my usual style..."
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-[#8B5CF6] resize-none"
                  />
                </div>

                {/* Coupon */}
                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#EC4899]" />
                    <span>Have a Promo Code?</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Try WELCOME10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white uppercase focus:outline-none focus:border-[#EC4899]"
                    />
                    <button
                      type="button"
                      disabled={validatingCoupon || !couponCode.trim()}
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 disabled:opacity-50 transition-colors"
                    >
                      {validatingCoupon ? "Checking..." : "Apply"}
                    </button>
                  </div>
                  {couponApplied && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {couponApplied.code} applied (−LKR{" "}
                      {couponApplied.discount.toLocaleString()})
                    </p>
                  )}
                  {couponError && (
                    <p className="text-xs text-red-400">{couponError}</p>
                  )}
                </div>
              </div>

              {/* Right — Summary Card */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5 h-fit">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-white/10">
                  Appointment Summary
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Salon</span>
                    <span className="font-semibold text-white text-right max-w-[55%]">
                      {selectedSalon?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Branch</span>
                    <span className="font-semibold text-white text-right max-w-[55%]">
                      {selectedBranch?.name}
                    </span>
                  </div>
                  {selectedBranch?.city && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Location</span>
                      <span className="font-semibold text-[#A78BFA] flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {selectedBranch.city}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Stylist</span>
                    <span className="font-semibold text-white">
                      {selectedStaff?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">
                      Date &amp; Time
                    </span>
                    <span className="font-semibold text-[#A78BFA] text-right">
                      {selectedDate} at {selectedSlot}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">
                      Est. Duration
                    </span>
                    <span className="font-semibold text-white">
                      {totalDuration} mins
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Services:
                  </p>
                  {selectedServices.map((s) => (
                    <div key={s.id} className="flex justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">
                        {s.name}
                      </span>
                      <span className="font-medium text-white">
                        LKR {s.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>Subtotal</span>
                    <span>LKR {subtotal.toLocaleString()}</span>
                  </div>
                  {couponApplied && (
                    <div className="flex justify-between text-xs text-emerald-400">
                      <span>Discount ({couponApplied.code})</span>
                      <span>
                        − LKR {couponApplied.discount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/10">
                    <span>Total Payable</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]">
                      LKR {finalTotal.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] italic">
                    * Pay at salon during appointment.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
              <button type="button" onClick={goBack} className={btnBack}>
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitBooking}
                className="px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-xl shadow-[#8B5CF6]/30 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirming Booking...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm &amp; Book Appointment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0A0B14] text-white">
          <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
        </div>
      }
    >
      <BookingWizard />
    </Suspense>
  );
}
