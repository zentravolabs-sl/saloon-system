"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function PendingSalonsPage() {
  const [salons, setSalons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPending = () => {
    setLoading(true);
    fetch("/api/super-admin/salons?status=PENDING")
      .then((res) => res.json())
      .then((data) => {
        if (data.salons) setSalons(data.salons);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleUpdateStatus = async (salonId: string, status: string, reason?: string) => {
    setActionLoading(salonId);
    try {
      const res = await fetch(`/api/super-admin/salons/${salonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason: reason }),
      });

      if (res.ok) {
        fetchPending();
      } else {
        alert("Failed to process salon approval");
      }
    } catch {
      alert("Error updating salon");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/super-admin/salons"
              className="text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to All Salons</span>
            </Link>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Pending Salon Approvals Queue
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Review registration submissions from new salon owners.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          <span>Checking pending submissions...</span>
        </div>
      ) : salons.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">No Pending Registrations</h3>
          <p className="text-xs text-[var(--text-muted)]">
            All submitted salon registrations have been reviewed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {salons.map((s) => (
            <div
              key={s.id}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4 hover:border-amber-500/30 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white">{s.name}</h3>
                    <span className="text-xs text-amber-400 font-semibold">{s.city}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    PENDING REVIEW
                  </span>
                </div>

                {s.description && (
                  <p className="text-xs text-[var(--text-secondary)]">{s.description}</p>
                )}

                <div className="space-y-1.5 text-xs text-[var(--text-muted)] pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">Owner:</span>
                    <span>{s.owner?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{s.email || s.owner?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{s.phone || s.owner?.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{s.address}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  disabled={actionLoading === s.id}
                  onClick={() => {
                    const reason = prompt("Rejection reason:") || "Incomplete requirements";
                    handleUpdateStatus(s.id, "REJECTED", reason);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition-colors"
                >
                  Reject Registration
                </button>
                <button
                  disabled={actionLoading === s.id}
                  onClick={() => handleUpdateStatus(s.id, "APPROVED")}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 hover:brightness-110 transition-all"
                >
                  Approve Salon
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
