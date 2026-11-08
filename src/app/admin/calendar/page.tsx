"use client";

import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  X,
  Play,
  RotateCcw,
  Loader2,
} from "lucide-react";

export default function AdminCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [staffList, setStaffList] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  const hours = [
    "09:00", "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
  ];

  const fetchCalendarData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/staff").then((res) => res.json()),
      fetch(`/api/bookings?date=${selectedDate}&limit=100`).then((res) => res.json()),
    ])
      .then(([staffData, bookingsData]) => {
        if (staffData.staff) setStaffList(staffData.staff);
        if (bookingsData.bookings) setBookings(bookingsData.bookings);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCalendarData();
  }, [selectedDate]);

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-500/20 text-[#D97706] border-amber-500/40",
    CONFIRMED: "bg-blue-500/20 text-[#1D4ED8] border-blue-500/40",
    CHECKED_IN: "bg-purple-500/20 text-[#6D28D9] border-purple-500/40",
    IN_PROGRESS: "bg-cyan-500/20 text-[#0284C7] border-cyan-500/40",
    COMPLETED: "bg-emerald-500/20 text-[#15803D] border-emerald-500/40",
    CANCELLED: "bg-red-500/20 text-[#B91C1C] border-red-500/40",
    REJECTED: "bg-red-500/20 text-[#B91C1C] border-red-500/40",
    NO_SHOW: "bg-zinc-500/20 text-[#64748B] border-zinc-500/40",
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
            Stylist Schedule & Calendar
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Hourly timeline view across staff columns for {selectedDate}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <button
              onClick={() => changeDate(-1)}
              className="p-1.5 rounded-lg hover:bg-[#F8FAFC] text-[var(--text-secondary)] hover:text-[#6D28D9]"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 bg-transparent text-xs font-bold text-[#0F172A] focus:outline-none"
            />
            <button
              onClick={() => changeDate(1)}
              className="p-1.5 rounded-lg hover:bg-[#F8FAFC] text-[var(--text-secondary)] hover:text-[#6D28D9]"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] transition-colors"
          >
            Today
          </button>

          <button
            onClick={fetchCalendarData}
            className="p-2 rounded-xl bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[var(--text-muted)] hover:text-[#6D28D9] border border-[#E2E8F0]"
            title="Refresh"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] overflow-x-auto">
        {loading ? (
          <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            <span>Loading calendar view...</span>
          </div>
        ) : staffList.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">
            No staff found for this salon.
          </div>
        ) : (
          <div className="min-w-[700px]">
            {/* Staff Headers Row */}
            <div
              className="grid border-b border-[#E2E8F0] bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
              style={{
                gridTemplateColumns: `80px repeat(${staffList.length}, minmax(180px, 1fr))`,
              }}
            >
              <div className="p-3 text-[11px] font-bold text-[var(--text-muted)] uppercase border-r border-[#E2E8F0]">
                Time
              </div>
              {staffList.map((st) => (
                <div
                  key={st.id}
                  className="p-3 text-center border-r border-[#E2E8F0] space-y-0.5"
                >
                  <p className="font-bold text-xs text-[#0F172A] truncate">{st.name}</p>
                  <p className="text-[10px] text-[#6D28D9] truncate">
                    {st.specialization || "Stylist"}
                  </p>
                </div>
              ))}
            </div>

            {/* Hourly Rows */}
            <div className="divide-y divide-[#E2E8F0]">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="grid min-h-[72px]"
                  style={{
                    gridTemplateColumns: `80px repeat(${staffList.length}, minmax(180px, 1fr))`,
                  }}
                >
                  {/* Hour label */}
                  <div className="p-2.5 text-xs text-[var(--text-muted)] font-mono font-medium border-r border-[#E2E8F0]">
                    {hour}
                  </div>

                  {/* Staff Cells */}
                  {staffList.map((st) => {
                    const slotBookings = bookings.filter(
                      (b) =>
                        b.staffId === st.id &&
                        b.startTime.startsWith(hour.substring(0, 2))
                    );

                    return (
                      <div
                        key={st.id}
                        className="p-1.5 border-r border-[#E2E8F0] space-y-1 relative"
                      >
                        {slotBookings.map((b) => (
                          <div
                            key={b.id}
                            onClick={() => setSelectedBooking(b)}
                            className={`p-2 rounded-xl border text-[11px] cursor-pointer transition-all hover:scale-[1.02] shadow-sm ${
                              statusColors[b.status] || "bg-[#F8FAFC] text-[#0F172A]"
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>{b.customer?.name}</span>
                              <span className="text-[10px]">{b.startTime}</span>
                            </div>
                            <p className="text-[10px] opacity-80 truncate">
                              {b.services?.map((s: any) => s.service?.name).join(", ")}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Appointment Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E2E8F0] p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                  {selectedBooking.reference}
                </span>
                <h3 className="text-base font-bold text-[#0F172A]">Appointment Details</h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#6D28D9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Customer:</span>
                <span className="font-bold text-[#0F172A]">
                  {selectedBooking.customer?.name} ({selectedBooking.customer?.phone})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Stylist:</span>
                <span className="font-semibold text-[#0F172A]">{selectedBooking.staff?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Time:</span>
                <span className="font-bold text-[#6D28D9]">
                  {selectedBooking.startTime} ({selectedBooking.status})
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[#0F172A]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
