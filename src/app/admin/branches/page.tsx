"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Clock,
  MapPin,
  Phone,
  Mail,
  CalendarOff,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  RotateCcw,
  Calendar,
  Trash2,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { useSalonStatus } from "@/context/SalonStatusContext";

interface ScheduleItem {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  hasBreak: boolean;
  breakStart?: string | null;
  breakEnd?: string | null;
}

interface ClosureItem {
  id: string;
  closureType: string;
  reason?: string | null;
  isFullDay: boolean;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function AdminBranchesPage() {
  const { isApproved } = useSalonStatus();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Branch Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Colombo");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bookingInterval, setBookingInterval] = useState(30);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Schedule Modal
  const [scheduleBranch, setScheduleBranch] = useState<any | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState("");

  // Closures Modal
  const [closureBranch, setClosureBranch] = useState<any | null>(null);
  const [closures, setClosures] = useState<ClosureItem[]>([]);
  const [loadingClosures, setLoadingClosures] = useState(false);
  const [newClosureDate, setNewClosureDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [newClosureType, setNewClosureType] = useState("PUBLIC_HOLIDAY");
  const [newClosureReason, setNewClosureReason] = useState("");
  const [newClosureFullDay, setNewClosureFullDay] = useState(true);
  const [newClosureStart, setNewClosureStart] = useState("13:00");
  const [newClosureEnd, setNewClosureEnd] = useState("17:00");
  const [savingClosure, setSavingClosure] = useState(false);
  const [closureError, setClosureError] = useState("");

  // Affected Bookings Warning Modal
  const [affectedWarning, setAffectedWarning] = useState<{
    count: number;
    payload: any;
  } | null>(null);
  const [cancellingAffected, setCancellingAffected] = useState(false);

  const fetchBranches = () => {
    setLoading(true);
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => {
        if (data.branches) setBranches(data.branches);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          bookingInterval: Number(bookingInterval),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create branch");
      } else {
        setShowAddModal(false);
        setName("");
        setAddress("");
        setPhone("");
        setEmail("");
        fetchBranches();
      }
    } catch {
      setError("Network error while creating branch");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (branchId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "CLOSED" : "ACTIVE";
    try {
      const res = await fetch(`/api/branches/${branchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchBranches();
      }
    } catch {
      alert("Failed to toggle status");
    }
  };

  // Open Schedule Modal
  const openScheduleModal = async (branch: any) => {
    setScheduleBranch(branch);
    setLoadingSchedule(true);
    setScheduleMsg("");
    try {
      const res = await fetch(`/api/branches/${branch.id}/schedule`);
      const data = await res.json();
      if (data.schedules && data.schedules.length > 0) {
        const sorted = [...data.schedules].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
        setSchedules(sorted);
      } else {
        setSchedules(
          DAYS_OF_WEEK.map((_, i) => ({
            dayOfWeek: i,
            isOpen: i !== 0,
            openTime: "09:00",
            closeTime: i === 5 || i === 6 ? "20:00" : "19:00",
            hasBreak: false,
            breakStart: "13:00",
            breakEnd: "14:00",
          }))
        );
      }
    } catch {
      setScheduleMsg("Failed to load schedule");
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleBranch) return;
    setSavingSchedule(true);
    setScheduleMsg("");
    try {
      const res = await fetch(`/api/branches/${scheduleBranch.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules }),
      });
      const data = await res.json();
      if (res.ok) {
        setScheduleMsg("Schedule updated successfully!");
        setTimeout(() => setScheduleBranch(null), 1200);
      } else {
        setScheduleMsg(data.error || "Failed to update schedule");
      }
    } catch {
      setScheduleMsg("Network error saving schedule");
    } finally {
      setSavingSchedule(false);
    }
  };

  // Open Closures Modal
  const openClosuresModal = async (branch: any) => {
    setClosureBranch(branch);
    setLoadingClosures(true);
    setClosureError("");
    setAffectedWarning(null);
    try {
      const res = await fetch(`/api/branches/${branch.id}/closures`);
      const data = await res.json();
      if (data.closures) setClosures(data.closures);
    } catch {
      setClosureError("Failed to load branch closures");
    } finally {
      setLoadingClosures(false);
    }
  };

  const handleAddClosure = async (force: boolean = false, cancelBookings: boolean = false) => {
    if (!closureBranch) return;
    setSavingClosure(true);
    setClosureError("");

    const payload = {
      closureType: newClosureType,
      reason: newClosureReason.trim() || undefined,
      isFullDay: newClosureFullDay,
      date: newClosureDate,
      startTime: !newClosureFullDay ? newClosureStart : undefined,
      endTime: !newClosureFullDay ? newClosureEnd : undefined,
      force,
      cancelBookings,
    };

    try {
      const res = await fetch(`/api/branches/${closureBranch.id}/closures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.warning) {
        setAffectedWarning({
          count: data.affectedBookings,
          payload,
        });
        return;
      }

      if (!res.ok) {
        setClosureError(data.error || "Failed to add closure");
      } else {
        setAffectedWarning(null);
        setNewClosureReason("");
        const updated = await fetch(`/api/branches/${closureBranch.id}/closures`);
        const updatedData = await updated.json();
        if (updatedData.closures) setClosures(updatedData.closures);
      }
    } catch {
      setClosureError("Network error while adding closure");
    } finally {
      setSavingClosure(false);
      setCancellingAffected(false);
    }
  };

  const handleDeleteClosure = async (closureId: string) => {
    if (!closureBranch) return;
    if (!confirm("Remove this branch closure?")) return;
    try {
      const res = await fetch(`/api/branches/${closureBranch.id}/closures/${closureId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setClosures((prev) => prev.filter((c) => c.id !== closureId));
      }
    } catch {
      alert("Failed to delete closure");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Branch Management
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Configure multiple locations, operating schedules, lunch breaks, and holiday closures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isApproved ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Branch</span>
            </button>
          ) : (
            <button
              disabled
              title="Salon registration is pending Super Admin approval. Creating branches is locked."
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-amber-300/80 border border-amber-500/20 cursor-not-allowed flex items-center gap-1.5 opacity-80"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Branch (Pending Approval)</span>
            </button>
          )}
          <button
            onClick={fetchBranches}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-white/10"
            title="Refresh"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Branches List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
          <span>Loading salon branches...</span>
        </div>
      ) : branches.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
          <Building2 className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-base font-bold text-white">No Branches Added</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Create your first branch location to start receiving customer appointments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((b) => (
            <div
              key={b.id}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4 hover:border-white/20 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA]">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">{b.name}</h3>
                      <span className="text-xs text-[var(--text-muted)]">{b.city}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      b.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <span className="truncate">{b.address}</span>
                  </div>
                  {b.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <span>Slot Interval: {b.bookingInterval} mins</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span>{b._count?.staff || 0} Stylists</span>
                  <span>•</span>
                  <span>{b._count?.bookings || 0} Bookings</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openScheduleModal(b)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Hours</span>
                  </button>
                  <button
                    onClick={() => openClosuresModal(b)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CalendarOff className="w-3.5 h-3.5 text-[#EC4899]" />
                    <span>Holidays</span>
                  </button>
                </div>

                <button
                  onClick={() => handleToggleStatus(b.id, b.status)}
                  className={`w-full py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    b.status === "ACTIVE"
                      ? "bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/20"
                      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
                  }`}
                >
                  {b.status === "ACTIVE" ? "Mark Branch Closed" : "Activate Branch"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Branch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0C0E1A] border border-white/10 p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#8B5CF6]" />
                Add New Salon Branch
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateBranch} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Galle Branch"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">City</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Galle"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 78 Fort Road, Galle"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Phone</label>
                  <input
                    type="tel"
                    placeholder="+9491..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Booking Interval</label>
                  <select
                    value={bookingInterval}
                    onChange={(e) => setBookingInterval(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  >
                    <option value={15} className="bg-[#111827]">15 minutes</option>
                    <option value={30} className="bg-[#111827]">30 minutes</option>
                    <option value={45} className="bg-[#111827]">45 minutes</option>
                    <option value={60} className="bg-[#111827]">60 minutes</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md disabled:opacity-50"
                >
                  {creating ? "Adding..." : "Save Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Operating Schedule Modal (Section 8) */}
      {scheduleBranch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0C0E1A] border border-white/10 p-6 space-y-5 animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#8B5CF6]" />
                  Operating Hours Schedule - {scheduleBranch.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Set branch opening/closing times and optional lunch breaks for each day of the week.
                </p>
              </div>
              <button
                onClick={() => setScheduleBranch(null)}
                className="p-1 rounded-lg text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {scheduleMsg && (
              <div
                className={`p-3 rounded-xl text-xs ${
                  scheduleMsg.includes("success")
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                {scheduleMsg}
              </div>
            )}

            {loadingSchedule ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
                <span>Loading schedules...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((sch, idx) => (
                  <div
                    key={sch.dayOfWeek}
                    className={`p-3.5 rounded-xl border text-xs transition-colors ${
                      sch.isOpen
                        ? "bg-white/[0.02] border-white/10"
                        : "bg-red-500/[0.03] border-red-500/20 opacity-75"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sch.isOpen}
                            onChange={(e) => {
                              const updated = [...schedules];
                              updated[idx].isOpen = e.target.checked;
                              setSchedules(updated);
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8B5CF6]"></div>
                        </label>
                        <span className="font-bold text-white w-24">
                          {DAYS_OF_WEEK[sch.dayOfWeek]}
                        </span>
                        {!sch.isOpen && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300">
                            CLOSED
                          </span>
                        )}
                      </div>

                      {sch.isOpen && (
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[var(--text-muted)]">Open:</span>
                            <input
                              type="time"
                              value={sch.openTime}
                              onChange={(e) => {
                                const updated = [...schedules];
                                updated[idx].openTime = e.target.value;
                                setSchedules(updated);
                              }}
                              className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-mono"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[var(--text-muted)]">Close:</span>
                            <input
                              type="time"
                              value={sch.closeTime}
                              onChange={(e) => {
                                const updated = [...schedules];
                                updated[idx].closeTime = e.target.value;
                                setSchedules(updated);
                              }}
                              className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-mono"
                            />
                          </div>

                          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sch.hasBreak}
                                onChange={(e) => {
                                  const updated = [...schedules];
                                  updated[idx].hasBreak = e.target.checked;
                                  if (!updated[idx].breakStart) updated[idx].breakStart = "13:00";
                                  if (!updated[idx].breakEnd) updated[idx].breakEnd = "14:00";
                                  setSchedules(updated);
                                }}
                                className="rounded text-[#8B5CF6]"
                              />
                              <span className="text-[var(--text-muted)] text-[11px]">Break</span>
                            </label>

                            {sch.hasBreak && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="time"
                                  value={sch.breakStart || "13:00"}
                                  onChange={(e) => {
                                    const updated = [...schedules];
                                    updated[idx].breakStart = e.target.value;
                                    setSchedules(updated);
                                  }}
                                  className="px-1.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-[11px]"
                                />
                                <span className="text-[var(--text-muted)]">-</span>
                                <input
                                  type="time"
                                  value={sch.breakEnd || "14:00"}
                                  onChange={(e) => {
                                    const updated = [...schedules];
                                    updated[idx].breakEnd = e.target.value;
                                    setSchedules(updated);
                                  }}
                                  className="px-1.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-[11px]"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
                  <button
                    onClick={() => setScheduleBranch(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSchedule}
                    disabled={savingSchedule}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {savingSchedule ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Schedule</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Holidays & Closures Modal (Section 9 & 10) */}
      {closureBranch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0C0E1A] border border-white/10 p-6 space-y-5 animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarOff className="w-4 h-4 text-[#EC4899]" />
                  Holidays & Closures - {closureBranch.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Manage full-day closures, emergency maintenance, and partial hour shutdowns.
                </p>
              </div>
              <button
                onClick={() => setClosureBranch(null)}
                className="p-1 rounded-lg text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {closureError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {closureError}
              </div>
            )}

            {/* Add New Closure Form */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Schedule New Closure / Holiday
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[var(--text-muted)] font-medium">Date</label>
                  <input
                    type="date"
                    value={newClosureDate}
                    onChange={(e) => setNewClosureDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-muted)] font-medium">Closure Type</label>
                  <select
                    value={newClosureType}
                    onChange={(e) => setNewClosureType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white"
                  >
                    <option value="PUBLIC_HOLIDAY" className="bg-[#111827]">Public Holiday</option>
                    <option value="SPECIAL_HOLIDAY" className="bg-[#111827]">Special Holiday</option>
                    <option value="WEEKLY_OFF" className="bg-[#111827]">Weekly Off</option>
                    <option value="EMERGENCY_CLOSURE" className="bg-[#111827]">Emergency Closure</option>
                    <option value="MAINTENANCE" className="bg-[#111827]">Maintenance</option>
                    <option value="OTHER" className="bg-[#111827]">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[var(--text-muted)] font-medium">Reason / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Christmas Day / Annual deep cleaning & electrical maintenance"
                  value={newClosureReason}
                  onChange={(e) => setNewClosureReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white"
                />
              </div>

              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newClosureFullDay}
                    onChange={(e) => setNewClosureFullDay(e.target.checked)}
                    className="rounded text-[#EC4899]"
                  />
                  <span className="text-white font-medium">Full Day Closure</span>
                </label>

                {!newClosureFullDay && (
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-muted)]">From:</span>
                    <input
                      type="time"
                      value={newClosureStart}
                      onChange={(e) => setNewClosureStart(e.target.value)}
                      className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white font-mono"
                    />
                    <span className="text-[var(--text-muted)]">To:</span>
                    <input
                      type="time"
                      value={newClosureEnd}
                      onChange={(e) => setNewClosureEnd(e.target.value)}
                      className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => handleAddClosure(false, false)}
                  disabled={savingClosure}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#EC4899] hover:bg-[#db2777] text-white shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingClosure ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Save Closure</span>
                </button>
              </div>
            </div>

            {/* List of Closures */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Configured Closures ({closures.length})
              </h4>

              {loadingClosures ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#EC4899]" />
                  <span>Loading closures...</span>
                </div>
              ) : closures.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                  No closures or holidays configured for this branch.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {closures.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            {new Date(c.date).toISOString().split("T")[0]}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                            {c.closureType.replace("_", " ")}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              c.isFullDay
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-cyan-500/20 text-cyan-300"
                            }`}
                          >
                            {c.isFullDay
                              ? "Full Day"
                              : `${c.startTime} - ${c.endTime}`}
                          </span>
                        </div>
                        {c.reason && (
                          <p className="text-[var(--text-muted)] text-[11px]">{c.reason}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteClosure(c.id)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                        title="Delete Closure"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Affected Bookings Warning Modal (Section 10) */}
      {affectedWarning && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111322] border border-amber-500/40 p-6 space-y-4 animate-scaleIn shadow-2xl shadow-amber-500/20">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Existing Bookings Conflict Warning
                </h3>
                <span className="text-xs text-amber-300 font-semibold">
                  Action required before closing branch
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs text-amber-200">
              <p className="font-bold text-amber-300">
                ⚠️ {affectedWarning.count} existing booking(s) will be affected by this closure!
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Closing the branch for this period will impact scheduled appointments.
                Please choose how you would like to proceed:
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  setCancellingAffected(true);
                  handleAddClosure(true, true);
                }}
                disabled={cancellingAffected}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                {cancellingAffected ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span>Cancel Affected Bookings & Notify Customers</span>
              </button>

              <button
                onClick={() => setAffectedWarning(null)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors"
              >
                Go Back / Adjust Closure Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
