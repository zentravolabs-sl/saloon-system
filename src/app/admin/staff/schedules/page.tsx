"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  Save,
  CheckCircle2,
  Users,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function StaffSchedulesPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    fetch("/api/staff")
      .then((res) => res.json())
      .then((data) => {
        if (data.staff?.length) {
          setStaffList(data.staff);
          setSelectedStaffId(data.staff[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedStaffId) return;
    const staff = staffList.find((s) => s.id === selectedStaffId);
    if (staff && staff.schedules) {
      // Sort 0 to 6
      const sorted = [...staff.schedules].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      setSchedules(sorted);
    }
  }, [selectedStaffId, staffList]);

  const updateDaySchedule = (dayIndex: number, field: string, value: any) => {
    setSchedules((prev) =>
      prev.map((sch) => (sch.dayOfWeek === dayIndex ? { ...sch, [field]: value } : sch))
    );
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const res = await fetch(`/api/staff/${selectedStaffId}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update schedule");
      }
    } catch {
      setError("Network error while saving schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            Weekly Staff Working Schedules
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Configure working hours, days off, and shift limits for each barber/stylist.
          </p>
        </div>

        <button
          onClick={handleSaveSchedule}
          disabled={saving || !selectedStaffId}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Save Changes</span>
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Staff working schedule successfully saved!</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Staff Selector */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center gap-4">
        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
          Select Stylist:
        </label>
        <select
          value={selectedStaffId}
          onChange={(e) => setSelectedStaffId(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none"
        >
          {staffList.map((st) => (
            <option key={st.id} value={st.id} className="bg-[#111827]">
              {st.name} ({st.specialization || "Stylist"})
            </option>
          ))}
        </select>
      </div>

      {/* Schedule Rows */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] divide-y divide-white/5">
        {loading ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            <span>Loading weekly shifts...</span>
          </div>
        ) : (
          daysOfWeek.map((dayName, idx) => {
            const sch = schedules.find((s) => s.dayOfWeek === idx) || {
              isWorking: idx !== 0,
              startTime: "09:00",
              endTime: "18:00",
            };

            return (
              <div
                key={dayName}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.01] transition-colors"
              >
                <div className="flex items-center gap-4 w-40">
                  <span className="font-bold text-sm text-white">{dayName}</span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={sch.isWorking}
                      onChange={(e) => updateDaySchedule(idx, "isWorking", e.target.checked)}
                      className="rounded"
                    />
                    <span className={sch.isWorking ? "text-emerald-400 font-semibold" : "text-red-400"}>
                      {sch.isWorking ? "Working" : "Day Off"}
                    </span>
                  </label>
                </div>

                {sch.isWorking ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--text-muted)]">From:</span>
                    <input
                      type="time"
                      value={sch.startTime || "09:00"}
                      onChange={(e) => updateDaySchedule(idx, "startTime", e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                    />
                    <span className="text-[var(--text-muted)]">To:</span>
                    <input
                      type="time"
                      value={sch.endTime || "18:00"}
                      onChange={(e) => updateDaySchedule(idx, "endTime", e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="text-xs text-[var(--text-muted)] italic">
                    Not accepting bookings on this day
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
