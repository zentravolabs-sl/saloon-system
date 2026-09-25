"use client";

import { useSalonStatus } from "@/context/SalonStatusContext";
import { Clock, ShieldAlert, XCircle, RotateCcw, Lock } from "lucide-react";

export function SalonApprovalBanner() {
  const { status, isApproved, loading, refreshStatus } = useSalonStatus();

  // If approved or still determining, or super admin, don't show restriction banner
  if (isApproved || !status) {
    return null;
  }

  if (status === "PENDING") {
    return (
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-transparent border border-amber-500/30 text-amber-200 shadow-xl shadow-amber-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 shadow-sm">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Account Pending Super Admin Approval / ගිණුම අනුමැතිය අපේක්ෂාවෙන්</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Pending Verification
              </span>
            </div>
            <p className="text-xs text-amber-200/80 mt-1 max-w-3xl leading-relaxed">
              Your salon registration has been received and is currently awaiting Super Admin review.
              Until verified and approved, adding new branches, stylists, services, and taking bookings are{" "}
              <strong className="text-white underline underline-offset-2">strictly locked</strong>.
              Your dashboard is in read-only preview mode.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            onClick={() => refreshStatus()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Check if Super Admin has approved your salon"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Check Approval Status</span>
          </button>
        </div>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 shadow-xl flex items-start gap-3.5 animate-fadeIn">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
          <XCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-white">Registration Rejected</h3>
          <p className="text-xs text-red-200/80 mt-1">
            This salon registration was rejected by the Super Admin. You cannot create branches, staff, or take appointments. Please contact platform support.
          </p>
        </div>
      </div>
    );
  }

  if (status === "SUSPENDED") {
    return (
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-200 shadow-xl flex items-start gap-3.5 animate-fadeIn">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-white">Account Suspended</h3>
          <p className="text-xs text-orange-200/80 mt-1">
            This salon account has been suspended by platform administration. All booking creation and modification features are locked.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
