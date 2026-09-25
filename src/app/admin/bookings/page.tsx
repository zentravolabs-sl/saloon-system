"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Users,
  Building2,
  DollarSign,
  Plus,
  Play,
  RotateCcw,
  Eye,
  X,
  Loader2,
  FileText,
  User,
  Phone,
  Lock,
} from "lucide-react";
import { useSalonStatus } from "@/context/SalonStatusContext";

function BookingsManager() {
  const { isApproved } = useSalonStatus();
  const searchParams = useSearchParams();
  const openNewModal = isApproved && searchParams.get("new") === "true";

  const [bookings, setBookings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showNewModal, setShowNewModal] = useState(openNewModal);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New Booking Form state (for Walk-in / Phone)
  const [branches, setBranches] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [newBranchId, setNewBranchId] = useState("");
  const [newStaffId, setNewStaffId] = useState("");
  const [newServiceId, setNewServiceId] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTime, setNewTime] = useState("10:00");
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchBookings = () => {
    setLoading(true);
    let url = `/api/bookings?page=1&limit=50`;
    if (statusFilter) url += `&status=${statusFilter}`;
    if (dateFilter) url += `&date=${dateFilter}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.bookings) {
          setBookings(data.bookings);
          setTotal(data.total || data.bookings.length);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, dateFilter]);

  // Load branches & services for New Booking modal
  useEffect(() => {
    if (showNewModal) {
      fetch("/api/branches")
        .then((res) => res.json())
        .then((data) => {
          if (data.branches?.length) {
            setBranches(data.branches);
            setNewBranchId(data.branches[0].id);
          }
        });
    }
  }, [showNewModal]);

  useEffect(() => {
    if (newBranchId) {
      fetch(`/api/services?branchId=${newBranchId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.services?.length) {
            setServices(data.services);
            setNewServiceId(data.services[0].id);
          }
        });

      fetch(`/api/staff?branchId=${newBranchId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.staff?.length) {
            setStaffList(data.staff);
            setNewStaffId(data.staff[0].id);
          }
        });
    }
  }, [newBranchId]);

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

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreatingBooking(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: newBranchId,
          staffId: newStaffId,
          serviceIds: [newServiceId],
          bookingDate: newDate,
          startTime: newTime,
          customerName: newCustName.trim(),
          customerPhone: newCustPhone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create booking.");
      } else {
        setShowNewModal(false);
        setNewCustName("");
        setNewCustPhone("");
        fetchBookings();
      }
    } catch {
      setCreateError("Error creating booking.");
    } finally {
      setCreatingBooking(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.reference.toLowerCase().includes(q) ||
      b.customer?.name.toLowerCase().includes(q) ||
      b.customer?.phone.includes(q) ||
      b.staff?.name.toLowerCase().includes(q)
    );
  });

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    CONFIRMED: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    CHECKED_IN: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    IN_PROGRESS: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    CANCELLED: "bg-red-500/10 text-red-300 border-red-500/20",
    REJECTED: "bg-red-500/10 text-red-300 border-red-500/20",
    NO_SHOW: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Bookings & Reservations
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Manage appointments, change statuses, register walk-ins, and inspect customer history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isApproved ? (
            <button
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Walk-In Booking</span>
            </button>
          ) : (
            <button
              disabled
              title="Salon registration is pending Super Admin approval. Booking creation is locked."
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-amber-300/80 border border-amber-500/20 cursor-not-allowed flex items-center gap-1.5 opacity-80"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Create Booking (Pending Approval)</span>
            </button>
          )}
          <button
            onClick={fetchBookings}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-white/10 transition-colors"
            title="Refresh"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by customer, phone, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
          >
            <option value="" className="bg-[#111827]">All Statuses</option>
            <option value="PENDING" className="bg-[#111827]">Pending</option>
            <option value="CONFIRMED" className="bg-[#111827]">Confirmed</option>
            <option value="CHECKED_IN" className="bg-[#111827]">Checked In</option>
            <option value="IN_PROGRESS" className="bg-[#111827]">In Progress</option>
            <option value="COMPLETED" className="bg-[#111827]">Completed</option>
            <option value="CANCELLED" className="bg-[#111827]">Cancelled</option>
            <option value="REJECTED" className="bg-[#111827]">Rejected</option>
            <option value="NO_SHOW" className="bg-[#111827]">No-Show</option>
          </select>

          {/* Date filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="text-[11px] text-[var(--text-muted)] hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            <span>Loading bookings...</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Calendar className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-sm font-semibold text-white">No bookings found</p>
            <p className="text-xs text-[var(--text-muted)]">
              Try adjusting your filter options or add a manual walk-in appointment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.01] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Stylist</th>
                  <th className="py-3 px-4">Services</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-white font-bold block">
                        {b.reference}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{b.customer?.name}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {b.customer?.phone}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      {b.branch?.name}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-white">
                      {b.staff?.name}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-white">
                        {b.services?.map((s: any) => s.service?.name).join(", ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{b.startTime}</span>
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
                          statusColors[b.status] || "bg-white/10 text-white"
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
                                onClick={() => handleUpdateStatus(b.id, "CONFIRMED")}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold border border-emerald-500/30 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt("Rejection reason:") || "Slot unavailable";
                                  handleUpdateStatus(b.id, "REJECTED", reason);
                                }}
                                className="px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 font-semibold border border-red-500/30 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {b.status === "CONFIRMED" && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(b.id, "CHECKED_IN")}
                                className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-semibold border border-purple-500/30 transition-colors"
                              >
                                Check-In
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(b.id, "NO_SHOW")}
                                className="px-2 py-1 rounded-lg bg-zinc-500/15 hover:bg-zinc-500/25 text-zinc-300 font-semibold border border-zinc-500/30 transition-colors"
                              >
                                No-Show
                              </button>
                            </>
                          )}

                          {b.status === "CHECKED_IN" && (
                            <button
                              onClick={() => handleUpdateStatus(b.id, "IN_PROGRESS")}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-semibold border border-cyan-500/30 transition-colors flex items-center gap-1"
                            >
                              <Play className="w-3 h-3 fill-cyan-300" />
                              <span>Start</span>
                            </button>
                          )}

                          {b.status === "IN_PROGRESS" && (
                            <button
                              onClick={() => handleUpdateStatus(b.id, "COMPLETED")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 transition-colors"
                            >
                              Complete
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0C0E1A] border border-white/10 p-6 space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                  {selectedBooking.reference}
                </span>
                <h3 className="text-lg font-bold text-white">Booking Details</h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1 rounded-lg text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-white/[0.02]">
                <span className="text-[var(--text-muted)]">Customer:</span>
                <span className="font-bold text-white">
                  {selectedBooking.customer?.name} ({selectedBooking.customer?.phone})
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/[0.02]">
                <span className="text-[var(--text-muted)]">Branch:</span>
                <span className="font-semibold text-white">{selectedBooking.branch?.name}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/[0.02]">
                <span className="text-[var(--text-muted)]">Stylist:</span>
                <span className="font-semibold text-white">{selectedBooking.staff?.name}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/[0.02]">
                <span className="text-[var(--text-muted)]">Date & Time:</span>
                <span className="font-bold text-[#A78BFA]">
                  {new Date(selectedBooking.bookingDate).toLocaleDateString()} at {selectedBooking.startTime}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/[0.02]">
                <span className="text-[var(--text-muted)]">Current Status:</span>
                <span className="font-bold text-emerald-400">{selectedBooking.status}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Walk-in "+ New Booking" Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0C0E1A] border border-white/10 p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#8B5CF6]" />
                Register Walk-in / Phone Booking
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateWalkIn} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Branch</label>
                  <select
                    value={newBranchId}
                    onChange={(e) => setNewBranchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-[#111827]">
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Stylist</label>
                  <select
                    value={newStaffId}
                    onChange={(e) => setNewStaffId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  >
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id} className="bg-[#111827]">
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Service</label>
                <select
                  value={newServiceId}
                  onChange={(e) => setNewServiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#111827]">
                      {s.name} (LKR {s.price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Time (HH:MM)</label>
                  <input
                    type="text"
                    required
                    placeholder="10:00"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Customer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ruwan Perera"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+9477..."
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBooking}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 disabled:opacity-50"
                >
                  {creatingBooking ? "Creating..." : "Confirm & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
