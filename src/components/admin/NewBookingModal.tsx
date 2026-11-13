"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Select, { type StylesConfig } from "react-select";
import {
  X,
  Plus,
  Search,
  Phone,
  UserCheck,
  UserPlus,
  Calendar,
  Clock,
  Scissors,
  User,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export type BookingChannel = "WALK_IN" | "PHONE";

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  totalBookings?: number;
}

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: { id: string; name: string };
  assignedStaff?: { id: string; name: string; status?: string }[];
}

interface StaffItem {
  id: string;
  name: string;
  status: string;
  specialization?: string | null;
}

interface BranchItem {
  id: string;
  name: string;
}

interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  price?: number;
  duration?: number;
}

interface NewBookingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (booking: any) => void;
  defaultSource?: BookingChannel;
}

function getTodayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getTomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const reactSelectStyles: StylesConfig<SelectOption, boolean> = {
  control: (base, state) => ({
    ...base,
    minHeight: "38px",
    borderRadius: "0.75rem",
    backgroundColor: "#F8FAFC",
    borderColor: state.isFocused ? "#7C3AED" : "#E2E8F0",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(124, 58, 237, 0.15)" : "none",
    "&:hover": {
      borderColor: state.isFocused ? "#7C3AED" : "#CBD5E1",
    },
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.75rem",
    overflow: "hidden",
    border: "1px solid #E2E8F0",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)",
    zIndex: 9999,
    fontSize: "12px",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#7C3AED"
      : state.isFocused
      ? "#F5F3FF"
      : "#FFFFFF",
    color: state.isSelected ? "#FFFFFF" : "#0F172A",
    fontWeight: state.isSelected ? 700 : 600,
    padding: "8px 12px",
    cursor: "pointer",
    ":active": {
      backgroundColor: "#6D28D9",
      color: "#FFFFFF",
    },
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "#EDE9FE",
    borderRadius: "0.5rem",
    padding: "0px 3px",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#5B21B6",
    fontWeight: 700,
    fontSize: "11px",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#6D28D9",
    borderRadius: "0.375rem",
    ":hover": {
      backgroundColor: "#DDD6FE",
      color: "#4C1D95",
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: "#94A3B8",
    fontWeight: 500,
  }),
  singleValue: (base) => ({
    ...base,
    color: "#0F172A",
    fontWeight: 700,
  }),
};

export function NewBookingModal({
  open,
  onClose,
  onSuccess,
  defaultSource = "WALK_IN",
}: NewBookingModalProps) {
  // 1. Booking Status / Channel: Walk-In & Phone
  const [source, setSource] = useState<BookingChannel>(defaultSource);

  // 2. Customer Mobile Search & New Customer Creation
  const [mobileQuery, setMobileQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerItem[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [hasSearchedCustomer, setHasSearchedCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [customerAddedMessage, setCustomerAddedMessage] = useState("");

  // 3. Internal default branchId + Services, Staff, Date & Time
  const [branchId, setBranchId] = useState("");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [staffId, setStaffId] = useState("");
  const [bookingDate, setBookingDate] = useState(getTodayIso());
  const [startTime, setStartTime] = useState("10:00");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");

  // Submission state
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setSource(defaultSource);
      setMobileQuery("");
      setCustomerResults([]);
      setHasSearchedCustomer(false);
      setSelectedCustomer(null);
      setNewCustomerName("");
      setCustomerAddedMessage("");
      setBookingDate(getTodayIso());
      setStartTime("10:00");
      setCustomerNotes("");
      setError("");
    }
  }, [open, defaultSource]);

  // Load default branch silently when modal opens
  useEffect(() => {
    if (!open) return;
    setLoadingInitial(true);
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => {
        const list: BranchItem[] = data.branches || [];
        if (list.length > 0) {
          setBranchId((prev) => (prev && list.some((b) => b.id === prev) ? prev : list[0].id));
        }
      })
      .catch(() => setError("Failed to load salon configuration."))
      .finally(() => setLoadingInitial(false));
  }, [open]);

  // Load services & staff
  useEffect(() => {
    if (!open || !branchId) return;
    Promise.all([
      fetch(`/api/services?branchId=${branchId}`).then((r) => r.json()),
      fetch(`/api/staff?branchId=${branchId}`).then((r) => r.json()),
    ])
      .then(([srvData, stData]) => {
        const srvList: ServiceItem[] = srvData.services || [];
        const activeStaff: StaffItem[] = (stData.staff || []).filter(
          (s: StaffItem) => s.status === "ACTIVE"
        );
        setServices(srvList);
        setStaffList(activeStaff);

        if (srvList.length > 0) {
          setSelectedServiceIds((prev) => {
            const valid = prev.filter((id) => srvList.some((s) => s.id === id));
            return valid.length > 0 ? valid : [srvList[0].id];
          });
        } else {
          setSelectedServiceIds([]);
        }

        if (activeStaff.length > 0) {
          setStaffId((prev) =>
            prev && activeStaff.some((s) => s.id === prev) ? prev : activeStaff[0].id
          );
        } else {
          setStaffId("");
        }
      })
      .catch(() => setError("Failed to load services and staff."));
  }, [open, branchId]);

  // Debounced search for customer by mobile number
  const searchCustomersByPhone = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 3) {
      setCustomerResults([]);
      setHasSearchedCustomer(false);
      return;
    }
    setSearchingCustomer(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(trimmed)}&limit=5`);
      const data = await res.json();
      const found: CustomerItem[] = data.customers || [];
      setCustomerResults(found);
      setHasSearchedCustomer(true);
    } catch {
      setCustomerResults([]);
      setHasSearchedCustomer(true);
    } finally {
      setSearchingCustomer(false);
    }
  }, []);

  useEffect(() => {
    if (!open || selectedCustomer) return;
    const trimmed = mobileQuery.trim();
    if (trimmed.length < 3) {
      setCustomerResults([]);
      setHasSearchedCustomer(false);
      return;
    }
    const timer = setTimeout(() => {
      searchCustomersByPhone(trimmed);
    }, 280);
    return () => clearTimeout(timer);
  }, [mobileQuery, open, selectedCustomer, searchCustomersByPhone]);

  // Selected services summary
  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );

  const totalAmount = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0),
    [selectedServices]
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.duration || 0), 0),
    [selectedServices]
  );

  // Filter eligible staff for selected services (fallback to all active staff if none specifically assigned)
  const eligibleStaff = useMemo(() => {
    if (selectedServices.length === 0) return staffList;
    const qualified = staffList.filter((st) =>
      selectedServices.every(
        (srv) =>
          !srv.assignedStaff ||
          srv.assignedStaff.length === 0 ||
          srv.assignedStaff.some((a) => a.id === st.id)
      )
    );
    return qualified.length > 0 ? qualified : staffList;
  }, [staffList, selectedServices]);

  useEffect(() => {
    if (eligibleStaff.length > 0 && !eligibleStaff.some((s) => s.id === staffId)) {
      setStaffId(eligibleStaff[0].id);
    }
  }, [eligibleStaff, staffId]);

  // Options for react-select Services dropdown
  const serviceOptions: SelectOption[] = useMemo(
    () =>
      services.map((srv) => ({
        value: srv.id,
        label: `${srv.name} — ${srv.duration} mins (LKR ${Number(srv.price).toLocaleString()})`,
        price: srv.price,
        duration: srv.duration,
      })),
    [services]
  );

  const selectedServiceOptions = useMemo(
    () => serviceOptions.filter((opt) => selectedServiceIds.includes(opt.value)),
    [serviceOptions, selectedServiceIds]
  );

  // Options for react-select Service Person (Staff) dropdown
  const staffOptions: SelectOption[] = useMemo(
    () =>
      eligibleStaff.map((st) => ({
        value: st.id,
        label: st.specialization ? `${st.name} (${st.specialization})` : st.name,
      })),
    [eligibleStaff]
  );

  const selectedStaffOption = useMemo(
    () => staffOptions.find((opt) => opt.value === staffId) || null,
    [staffOptions, staffId]
  );

  // Fetch available time slots when branch, staff, services, or date changes
  useEffect(() => {
    if (!open || !branchId || !staffId || selectedServiceIds.length === 0 || !bookingDate) {
      setAvailableSlots([]);
      return;
    }
    let active = true;
    setSlotsLoading(true);
    fetch(
      `/api/availability?branchId=${branchId}&staffId=${staffId}&serviceIds=${selectedServiceIds.join(",")}&date=${bookingDate}&admin=true`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const freeSlots: string[] = (data.slots || [])
          .filter((s: { available: boolean; startTime: string }) => s.available)
          .map((s: { startTime: string }) => s.startTime);
        setAvailableSlots(freeSlots);
        if (freeSlots.length > 0 && !freeSlots.includes(startTime)) {
          setStartTime(freeSlots[0]);
        }
      })
      .catch(() => {
        if (active) setAvailableSlots([]);
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, branchId, staffId, selectedServiceIds, bookingDate]);

  const handleSelectExistingCustomer = (c: CustomerItem) => {
    setSelectedCustomer(c);
    setMobileQuery(c.phone);
    setNewCustomerName(c.name);
    setCustomerResults([]);
    setCustomerAddedMessage("");
    setError("");
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerAddedMessage("");
    setNewCustomerName("");
  };

  // Add customer to DB directly via POST /api/customers
  const handleAddCustomerToDb = async () => {
    const phone = mobileQuery.trim();
    const name = newCustomerName.trim();
    if (phone.length < 7) {
      setError("Please enter a valid mobile number (at least 7 digits).");
      return;
    }
    if (name.length < 2) {
      setError("Please enter the customer's name (at least 2 characters).");
      return;
    }

    setError("");
    setAddingCustomer(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add customer to database.");
      } else if (data.customer) {
        setSelectedCustomer({
          id: data.customer.id,
          name: data.customer.name,
          phone: data.customer.phone,
        });
        setMobileQuery(data.customer.phone);
        setNewCustomerName(data.customer.name);
        setCustomerResults([]);
        setCustomerAddedMessage(
          data.existing
            ? "Existing customer matched and selected."
            : "New customer added to database!"
        );
      }
    } catch {
      setError("Error saving customer to database.");
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const finalPhone = (selectedCustomer?.phone || mobileQuery).trim();
    const finalName = (selectedCustomer?.name || newCustomerName).trim();

    if (finalPhone.length < 7) {
      setError("Please enter a valid customer mobile number.");
      return;
    }
    if (finalName.length < 2) {
      setError("Please select an existing customer or enter the new customer's name.");
      return;
    }
    if (!branchId) {
      setError("Salon branch is not configured.");
      return;
    }
    if (selectedServiceIds.length === 0) {
      setError("Please select at least one service.");
      return;
    }
    if (!staffId) {
      setError("Please select the staff member performing the service.");
      return;
    }
    if (!bookingDate || !startTime) {
      setError("Please select both date and time.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          staffId,
          serviceIds: selectedServiceIds,
          bookingDate,
          startTime,
          customerName: finalName,
          customerPhone: finalPhone,
          customerNotes: customerNotes.trim() || undefined,
          source,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create booking.");
      } else {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("booking:created", { detail: data.booking }));
        }
        onSuccess?.(data.booking);
        onClose();
      }
    } catch {
      setError("Network error while creating booking.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const sourceOptions: {
    value: BookingChannel;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    activeClass: string;
  }[] = [
    {
      value: "WALK_IN",
      label: "Walk-In",
      sublabel: "In-person visit",
      icon: UserCheck,
      activeClass:
        "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white border-transparent shadow-md shadow-[#8B5CF6]/25",
    },
    {
      value: "PHONE",
      label: "Phone",
      sublabel: "Call reservation",
      icon: Phone,
      activeClass:
        "bg-gradient-to-r from-[#0284C7] to-[#2563EB] text-white border-transparent shadow-md shadow-blue-500/25",
    },
  ];

  const todayIso = getTodayIso();
  const tomorrowIso = getTomorrowIso();
  const menuPortalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-booking-modal-title"
    >
      <div className="w-full max-w-4xl rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col animate-scaleIn">
        {/* Compact Modal Header */}
        <div className="px-5 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#F5F3FF] via-white to-[#F5F3FF] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-white shadow-sm">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="new-booking-modal-title"
                className="text-sm sm:text-base font-extrabold text-[#0F172A] leading-tight"
              >
                New Appointment Booking
              </h2>
              <p className="text-[11px] text-[#64748B] font-medium">
                Search customer by mobile, select service, stylist, date &amp; time
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wide 2-Column Modal Body */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs"
        >
          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-[#B91C1C] text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TOP GRID: Left (Booking Status + Customer Lookup) | Right (Services + Stylist + Notes) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* LEFT COLUMN (6 cols): 1. Booking Status + 2. Customer Mobile Search */}
            <div className="lg:col-span-6 space-y-3.5">
              {/* 1. BOOKING STATUS: Walk-In & Phone */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                  1. Booking Status
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {sourceOptions.map((opt) => {
                    const Icon = opt.icon;
                    const active = source === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSource(opt.value)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? opt.activeClass
                            : "bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:border-[#CBD5E1] hover:bg-[#F1F5F9]"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <div className="min-w-0">
                          <span className="block text-xs sm:text-sm font-extrabold leading-tight truncate">
                            {opt.label}
                          </span>
                          <span
                            className={`block text-[10.5px] truncate ${
                              active ? "text-white/85" : "text-[#64748B]"
                            }`}
                          >
                            {opt.sublabel}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. CUSTOMER MOBILE NUMBER SEARCH / QUICK ADD */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="booking-customer-mobile"
                    className="text-[11px] font-bold uppercase tracking-wider text-[#475569] flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#6D28D9]" />
                    <span>2. Customer Mobile Number</span>
                  </label>
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="text-[11px] font-bold text-[#6D28D9] hover:underline cursor-pointer"
                    >
                      Change Customer
                    </button>
                  )}
                </div>

                {selectedCustomer ? (
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-extrabold text-[#0F172A]">
                            {selectedCustomer.name}
                          </p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-[#15803D]">
                            Selected
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#334155]">
                          {selectedCustomer.phone}
                        </p>
                        {customerAddedMessage && (
                          <p className="text-[10.5px] text-[#15803D] font-medium mt-0.5">
                            {customerAddedMessage}
                          </p>
                        )}
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0" />
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                        <input
                          id="booking-customer-mobile"
                          type="tel"
                          value={mobileQuery}
                          onChange={(e) => setMobileQuery(e.target.value)}
                          placeholder="Enter mobile number (e.g. 0771234567)..."
                          className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15"
                        />
                        {searchingCustomer && (
                          <Loader2 className="w-4 h-4 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6D28D9]" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => searchCustomersByPhone(mobileQuery)}
                        disabled={mobileQuery.trim().length < 3 || searchingCustomer}
                        className="px-3 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#7C3AED] text-xs font-bold text-[#0F172A] hover:text-[#6D28D9] disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                      >
                        Search
                      </button>
                    </div>

                    {customerResults.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold text-[#15803D]">
                          Existing customer(s) found — click to select:
                        </p>
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                          {customerResults.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectExistingCustomer(c)}
                              className="w-full flex items-center justify-between p-2 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#7C3AED] hover:bg-[#F5F3FF]/60 transition-all text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#6D28D9] font-bold text-[11px] flex items-center justify-center">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-[#0F172A] block text-xs">
                                    {c.name}
                                  </span>
                                  <span className="text-[10.5px] text-[#64748B] font-medium">
                                    {c.phone}
                                  </span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-lg bg-[#EDE9FE] text-[#6D28D9] font-bold text-[10.5px]">
                                Select
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {((hasSearchedCustomer && customerResults.length === 0) ||
                      mobileQuery.trim().length >= 3) && (
                      <div className="pt-2 border-t border-[#E2E8F0] space-y-1.5">
                        {hasSearchedCustomer && customerResults.length === 0 && (
                          <p className="text-[11px] font-semibold text-[#D97706] flex items-center gap-1">
                            <UserPlus className="w-3.5 h-3.5 shrink-0" />
                            <span>Not in DB — enter name to add with mobile &amp; name:</span>
                          </p>
                        )}
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                            <input
                              type="text"
                              value={newCustomerName}
                              onChange={(e) => setNewCustomerName(e.target.value)}
                              placeholder="Customer full name (e.g. Kasun Perera)"
                              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#7C3AED]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddCustomerToDb}
                            disabled={
                              addingCustomer ||
                              mobileQuery.trim().length < 7 ||
                              newCustomerName.trim().length < 2
                            }
                            className="px-3 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                          >
                            {addingCustomer ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN (6 cols): 3. Services + 4. Stylist + Notes */}
            <div className="lg:col-span-6 space-y-3.5">
              {/* 3. SELECT SERVICE(S) WANTED */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-[#6D28D9]" />
                    <span>3. Select Service(s)</span>
                  </label>
                  {selectedServices.length > 0 && (
                    <span className="text-[11px] font-extrabold text-[#6D28D9]">
                      {selectedServices.length} selected · {totalDuration} min · LKR{" "}
                      {totalAmount.toLocaleString()}
                    </span>
                  )}
                </div>

                <Select<SelectOption, true>
                  isMulti
                  isSearchable
                  isLoading={loadingInitial}
                  closeMenuOnSelect={false}
                  options={serviceOptions}
                  value={selectedServiceOptions}
                  onChange={(selected) => {
                    setSelectedServiceIds(selected ? selected.map((item) => item.value) : []);
                  }}
                  placeholder="Search and select service(s)..."
                  noOptionsMessage={() => "No matching services found"}
                  styles={reactSelectStyles}
                  menuPortalTarget={menuPortalTarget}
                  menuPosition="fixed"
                  instanceId="booking-services-select"
                />
              </div>

              {/* 4. PERSON DOING THE SERVICE (STYLIST) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#6D28D9]" />
                  <span>4. Person Doing the Service (Stylist)</span>
                </label>
                <Select<SelectOption, false>
                  isSearchable
                  isLoading={loadingInitial}
                  options={staffOptions}
                  value={selectedStaffOption}
                  onChange={(selected) => {
                    setStaffId(selected ? selected.value : "");
                  }}
                  placeholder="Search and select stylist..."
                  noOptionsMessage={() => "No available staff found"}
                  styles={reactSelectStyles}
                  menuPortalTarget={menuPortalTarget}
                  menuPosition="fixed"
                  instanceId="booking-staff-select"
                />
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <label
                  htmlFor="booking-notes"
                  className="text-[11px] font-bold uppercase tracking-wider text-[#475569]"
                >
                  Notes (Optional)
                </label>
                <input
                  id="booking-notes"
                  type="text"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Any special requests or notes..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: 5. Date (with Highlighted Today/Tomorrow) + 6. Time + Available Slots */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Date + Highlighted Bigger Today & Tomorrow */}
              <div className="md:col-span-7 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label
                    htmlFor="booking-date-input"
                    className="text-[11px] font-bold uppercase tracking-wider text-[#475569] flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#6D28D9]" />
                    <span>5. Date</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBookingDate(todayIso)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold border transition-all cursor-pointer ${
                        bookingDate === todayIso
                          ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white border-[#6D28D9] shadow-md shadow-[#8B5CF6]/25 scale-[1.02]"
                          : "bg-[#EDE9FE] text-[#5B21B6] border-[#C4B5FD] hover:bg-[#DDD6FE]"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingDate(tomorrowIso)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold border transition-all cursor-pointer ${
                        bookingDate === tomorrowIso
                          ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white border-[#6D28D9] shadow-md shadow-[#8B5CF6]/25 scale-[1.02]"
                          : "bg-[#EDE9FE] text-[#5B21B6] border-[#C4B5FD] hover:bg-[#DDD6FE]"
                      }`}
                    >
                      Tomorrow
                    </button>
                  </div>
                </div>
                <input
                  id="booking-date-input"
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              {/* Time */}
              <div className="md:col-span-5 space-y-1.5">
                <label
                  htmlFor="booking-time-input"
                  className="text-[11px] font-bold uppercase tracking-wider text-[#475569] flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-[#6D28D9]" />
                  <span>6. Time</span>
                </label>
                <input
                  id="booking-time-input"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
            </div>

            {/* Available Time Slots */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#64748B]">
                  Available Time Slots
                </span>
                {slotsLoading && (
                  <span className="text-[11px] text-[#6D28D9] flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking schedule...
                  </span>
                )}
              </div>
              {availableSlots.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {availableSlots.map((slotTime) => {
                    const active = startTime === slotTime;
                    return (
                      <button
                        key={slotTime}
                        type="button"
                        onClick={() => setStartTime(slotTime)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          active
                            ? "bg-[#7C3AED] border-[#7C3AED] text-white shadow-xs"
                            : "bg-white border-[#E2E8F0] text-[#0F172A] hover:border-[#A78BFA]"
                        }`}
                      >
                        {slotTime}
                      </button>
                    );
                  })}
                </div>
              ) : !slotsLoading ? (
                <p className="text-[11px] text-[#64748B]">
                  You can select or type any preferred time in the Time field above.
                </p>
              ) : null}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="text-[#64748B] font-medium">Total: </span>
              <span className="text-sm font-extrabold text-[#0F172A]">
                LKR {totalAmount.toLocaleString()}
              </span>
              <span className="text-[11px] text-[#64748B] ml-1.5">
                ({totalDuration} mins)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-md shadow-[#8B5CF6]/25 hover:brightness-105 disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Booking...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm &amp; Save Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
