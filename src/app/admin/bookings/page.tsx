"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Select, { type StylesConfig } from "react-select";
import {
  Calendar,
  Search,
  Plus,
  Play,
  RotateCcw,
  Eye,
  X,
  Loader2,
  Phone,
  UserCheck,
  Lock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSalonStatus } from "@/context/SalonStatusContext";
import { NewBookingModal } from "@/components/admin/NewBookingModal";

const PAGE_SIZE = 7;

interface FilterOption {
  value: string;
  label: string;
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CHECKED_IN", label: "Checked In" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NO_SHOW", label: "No-Show" },
];

const filterSelectStyles: StylesConfig<FilterOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "36px",
    minWidth: "165px",
    borderRadius: "0.75rem",
    backgroundColor: "#F8FAFC",
    borderColor: state.isFocused ? "#8B5CF6" : "#E2E8F0",
    boxShadow: "none",
    "&:hover": {
      borderColor: state.isFocused ? "#8B5CF6" : "#CBD5E1",
    },
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.75rem",
    overflow: "hidden",
    border: "1px solid #E2E8F0",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.1)",
    zIndex: 40,
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
  }),
  singleValue: (base) => ({
    ...base,
    color: "#0F172A",
    fontWeight: 600,
  }),
};

const SOURCE_LABELS: Record<string, { label: string; style: string }> = {
  WALK_IN: {
    label: "Walk-In",
    style: "bg-violet-500/10 text-[#6D28D9] border-violet-500/25",
  },
  PHONE: {
    label: "Phone",
    style: "bg-blue-500/10 text-[#1D4ED8] border-blue-500/25",
  },
};

function BookingsManager() {
  const { isApproved } = useSalonStatus();
  const searchParams = useSearchParams();
  const openNewModal = isApproved && searchParams.get("new") === "true";

  const [bookings, setBookings] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showNewModal, setShowNewModal] = useState(openNewModal);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (openNewModal) {
      setShowNewModal(true);
    }
  }, [openNewModal]);

  const fetchBookings = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (sourceFilter) params.set("source", sourceFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (dateFilter) params.set("date", dateFilter);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());

    fetch(`/api/bookings?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.bookings) {
          setBookings(data.bookings);
          const totalCount =
            typeof data.total === "number" ? data.total : data.bookings.length;
          setTotal(totalCount);
          setTotalPages(
            typeof data.totalPages === "number"
              ? data.totalPages
              : Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
          );
        }
      })
      .finally(() => setLoading(false));
  }, [page, sourceFilter, statusFilter, dateFilter, searchQuery]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    const onCreated = () => {
      if (page !== 1) {
        setPage(1);
      } else {
        fetchBookings();
      }
    };
    window.addEventListener("booking:created", onCreated);
    return () => window.removeEventListener("booking:created", onCreated);
  }, [page, fetchBookings]);

  const handleUpdateStatus = async (bookingId: string, status: string, reason?: string) => {
    setActionLoading(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });

      if (res.ok) {
        fetchBookings();
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking((prev: any) => ({ ...prev, status }));
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update booking status");
      }
    } catch {
      alert("Error updating booking");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleSourceChange = (value: string) => {
    setSourceFilter(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleDateChange = (value: string) => {
    setDateFilter(value);
    setPage(1);
  };

  const startRecord = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(page * PAGE_SIZE, total);

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-[#D97706] border-amber-500/20",
    CONFIRMED: "bg-blue-500/10 text-[#1D4ED8] border-blue-500/20",
    CHECKED_IN: "bg-purple-500/10 text-[#6D28D9] border-purple-500/20",
    IN_PROGRESS: "bg-cyan-500/10 text-[#0284C7] border-cyan-500/20",
    COMPLETED: "bg-emerald-500/10 text-[#15803D] border-emerald-500/20",
    CANCELLED: "bg-red-500/10 text-[#B91C1C] border-red-500/20",
    REJECTED: "bg-red-500/10 text-[#B91C1C] border-red-500/20",
    NO_SHOW: "bg-zinc-500/10 text-[#64748B] border-zinc-500/20",
  };

  const selectedStatusOption =
    STATUS_OPTIONS.find((opt) => opt.value === statusFilter) || STATUS_OPTIONS[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
            Bookings &amp; Reservations
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Manage Walk-In and Phone appointments, search customers by mobile, and update statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isApproved ? (
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Booking</span>
            </button>
          ) : (
            <button
              disabled
              title="Salon registration is pending Super Admin approval. Booking creation is locked."
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] text-[#D97706]/80 border border-amber-500/20 cursor-not-allowed flex items-center gap-1.5 opacity-80"
            >
              <Lock className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Create Booking (Pending Approval)</span>
            </button>
          )}
          <button
            type="button"
            onClick={fetchBookings}
            className="p-2 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[var(--text-muted)] hover:text-[#6D28D9] border border-[#E2E8F0] transition-colors cursor-pointer"
            title="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Filter Pills (Walk-In & Phone) + Search & Filters */}
      <div className="p-4 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "", label: "All Bookings", icon: Calendar },
            { value: "WALK_IN", label: "Walk-In", icon: UserCheck },
            { value: "PHONE", label: "Phone", icon: Phone },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = sourceFilter === tab.value;
            return (
              <button
                key={tab.value || "ALL"}
                type="button"
                onClick={() => handleSourceChange(tab.value)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  active
                    ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white border-transparent shadow-xs"
                    : "bg-[#F8FAFC] border-[#E2E8F0] text-[#334155] hover:border-[#CBD5E1]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by customer, mobile phone, or reference..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Status filter using react-select */}
            <div className="min-w-[170px]">
              <Select<FilterOption, false>
                isSearchable
                options={STATUS_OPTIONS}
                value={selectedStatusOption}
                onChange={(opt) => handleStatusChange(opt ? opt.value : "")}
                styles={filterSelectStyles}
                instanceId="bookings-status-filter-select"
              />
            </div>

            {/* Date filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-[#8B5CF6]"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => handleDateChange("")}
                className="text-[11px] text-[var(--text-muted)] hover:text-[#6D28D9]"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            <span>Loading bookings...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Calendar className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-sm font-semibold text-[#0F172A]">No bookings found</p>
            <p className="text-xs text-[var(--text-muted)]">
              Try adjusting your filter options or click &ldquo;New Booking&rdquo; to add an appointment.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Stylist</th>
                    <th className="py-3 px-4">Services</th>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {bookings.map((b) => {
                    const sourceBadge =
                      b.source === "PHONE" ? SOURCE_LABELS.PHONE : SOURCE_LABELS.WALK_IN;
                    return (
                      <tr
                        key={b.id}
                        className="hover:bg-[#F1F5F9] shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[#0F172A] font-bold block">
                            {b.reference}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#0F172A] block">
                            {b.customer?.name}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {b.customer?.phone}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${sourceBadge.style}`}
                          >
                            {sourceBadge.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                          {b.staff?.name}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[#0F172A]">
                            {b.services?.map((s: any) => s.service?.name).join(", ")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#0F172A] block">
                            {b.startTime}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {new Date(b.bookingDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              statusColors[b.status] || "bg-[#F8FAFC] text-[#0F172A]"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {actionLoading === b.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6] inline-block" />
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              {b.status === "PENDING" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(b.id, "CONFIRMED")}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-[#15803D] font-semibold border border-emerald-500/30 transition-colors"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const reason =
                                        prompt("Rejection reason:") || "Slot unavailable";
                                      handleUpdateStatus(b.id, "REJECTED", reason);
                                    }}
                                    className="px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-[#B91C1C] font-semibold border border-red-500/30 transition-colors"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {b.status === "CONFIRMED" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(b.id, "CHECKED_IN")}
                                    className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-[#6D28D9] font-semibold border border-purple-500/30 transition-colors"
                                  >
                                    Check-In
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(b.id, "NO_SHOW")}
                                    className="px-2 py-1 rounded-lg bg-zinc-500/15 hover:bg-zinc-500/25 text-[#334155] font-semibold border border-zinc-500/30 transition-colors"
                                  >
                                    No-Show
                                  </button>
                                </>
                              )}

                              {b.status === "CHECKED_IN" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(b.id, "IN_PROGRESS")}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-[#0284C7] font-semibold border border-cyan-500/30 transition-colors flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3 fill-cyan-300" />
                                  <span>Start</span>
                                </button>
                              )}

                              {b.status === "IN_PROGRESS" && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(b.id, "COMPLETED")}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-[#15803D] font-bold border border-emerald-500/40 transition-colors"
                                >
                                  Complete
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedBooking(b)}
                                className="p-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[var(--text-secondary)] hover:text-[#6D28D9] transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]/60 text-xs">
              <div className="text-[var(--text-muted)] font-medium">
                Showing <span className="font-bold text-[#0F172A]">{startRecord}</span> to{" "}
                <span className="font-bold text-[#0F172A]">{endRecord}</span> of{" "}
                <span className="font-bold text-[#0F172A]">{total}</span> bookings
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] font-semibold hover:bg-[#F1F5F9] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - page) <= 1
                    )
                    .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                        acc.push("ellipsis");
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "ellipsis" ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1.5 text-[var(--text-muted)] select-none"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPage(item)}
                          disabled={loading}
                          className={`min-w-[28px] h-7 px-2 rounded-lg font-bold text-xs transition-colors ${
                            page === item
                              ? "bg-[#8B5CF6] text-white shadow-sm"
                              : "bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9]"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] font-semibold hover:bg-[#F1F5F9] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E2E8F0] p-6 space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                  {selectedBooking.reference}
                </span>
                <h3 className="text-lg font-bold text-[#0F172A]">Booking Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#6D28D9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <span className="text-[var(--text-muted)]">Booking Type:</span>
                <span className="font-bold text-[#6D28D9]">
                  {selectedBooking.source === "PHONE" ? "Phone" : "Walk-In"}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <span className="text-[var(--text-muted)]">Customer:</span>
                <span className="font-bold text-[#0F172A]">
                  {selectedBooking.customer?.name} ({selectedBooking.customer?.phone})
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <span className="text-[var(--text-muted)]">Stylist:</span>
                <span className="font-semibold text-[#0F172A]">{selectedBooking.staff?.name}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <span className="text-[var(--text-muted)]">Date &amp; Time:</span>
                <span className="font-bold text-[#6D28D9]">
                  {new Date(selectedBooking.bookingDate).toLocaleDateString()} at{" "}
                  {selectedBooking.startTime}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <span className="text-[var(--text-muted)]">Current Status:</span>
                <span className="font-bold text-[#15803D]">{selectedBooking.status}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Booking Modal (Walk-In & Phone) */}
      <NewBookingModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
      />
    </div>
  );
}

export default function AdminBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          <Loader2 className="w-6 h-6 animate-spin text-[#8B5CF6]" />
          <span>Loading bookings manager...</span>
        </div>
      }
    >
      <BookingsManager />
    </Suspense>
  );
}
