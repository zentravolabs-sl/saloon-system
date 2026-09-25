"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarOff,
  Plus,
  ChevronLeft,
  X,
  Loader2,
  Calendar,
  Clock,
  User,
  AlertCircle,
} from "lucide-react";

export default function StaffLeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Leave Modal
  const [showModal, setShowModal] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [isFullDay, setIsFullDay] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchLeaves = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/staff/leaves").then((res) => res.json()),
      fetch("/api/staff").then((res) => res.json()),
    ])
      .then(([leavesData, staffData]) => {
        if (leavesData.leaves) setLeaves(leavesData.leaves);
        if (staffData.staff) {
          setStaffList(staffData.staff);
          if (staffData.staff.length > 0 && !staffId) {
            setStaffId(staffData.staff[0].id);
          }
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/staff/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          leaveType,
          isFullDay,
          startDate,
          endDate: isFullDay ? endDate : startDate,
          startTime: !isFullDay ? startTime : undefined,
          endTime: !isFullDay ? endTime : undefined,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to record leave");
      } else {
        setShowModal(false);
        setReason("");
        fetchLeaves();
      }
    } catch {
      setError("Network error recording leave");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/staff"
              className="text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Staff</span>
            </Link>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Staff Leave Management
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Schedule full-day holidays and partial leave hours. Slot engine dynamically blocks bookings.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Leave</span>
        </button>
      </div>

      {/* Leaves Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            <span>Loading leave records...</span>
          </div>
        ) : leaves.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CalendarOff className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-sm font-semibold text-white">No Leave Records</p>
            <p className="text-xs text-[var(--text-muted)]">
              All staff members are on normal duty. Record leave using the button above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.01] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Stylist</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {l.staff?.name}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 font-semibold text-[11px] text-[var(--text-secondary)]">
                        {l.leaveType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-white">
                      {new Date(l.startDate).toLocaleDateString()}
                      {l.startDate !== l.endDate && (
                        <span> – {new Date(l.endDate).toLocaleDateString()}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      {l.isFullDay ? (
                        <span className="text-amber-400 font-semibold">Full Day</span>
                      ) : (
                        <span>
                          {l.startTime} – {l.endTime}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[var(--text-muted)] italic">
                      {l.reason || "Personal"}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        APPROVED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0C0E1A] border border-white/10 p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-[#EC4899]" />
                Record Staff Leave
              </h3>
              <button
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleCreateLeave} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Stylist *</label>
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                >
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id} className="bg-[#111827]">
                      {st.name} ({st.specialization || "Stylist"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  >
                    <option value="ANNUAL" className="bg-[#111827]">Annual Leave</option>
                    <option value="SICK" className="bg-[#111827]">Sick Leave</option>
                    <option value="PERSONAL" className="bg-[#111827]">Personal Leave</option>
                    <option value="EMERGENCY" className="bg-[#111827]">Emergency Leave</option>
                    <option value="OTHER" className="bg-[#111827]">Other</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFullDay}
                      onChange={(e) => setIsFullDay(e.target.checked)}
                    />
                    <span className="text-white">Full Day Leave</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  />
                </div>

                {isFullDay ? (
                  <div className="space-y-1">
                    <label className="text-[var(--text-secondary)] font-medium">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="space-y-1">
                      <label className="text-[var(--text-secondary)] font-medium">From</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[var(--text-secondary)] font-medium">To</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Reason (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Medical checkup, family commitment"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Approve Leave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
