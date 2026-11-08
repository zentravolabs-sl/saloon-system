"use client";

import { useSalonStatus } from "@/context/SalonStatusContext";
import { Clock, ShieldAlert, XCircle, RotateCcw, Lock } from "lucide-react";

export function SalonApprovalBanner() {
  const { status, isApproved, loading, refreshStatus } = useSalonStatus();

  if (isApproved || !status) {
    return null;
  }

  if (status === "PENDING") {
    return (
      <div className="mb-6 p-4 sm:p-5 rounded-[22px] bg-[#FEF3C7]/90 border border-[#FDE68A] text-[#92400E] shadow-[0_8px_24px_rgba(217,119,6,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#FDE68A] flex items-center justify-center text-[#D97706] shrink-0 mt-0.5 shadow-xs">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm text-[#0F172A] flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#D97706]" />
                <span>Account Pending Super Admin Approval / ගිණුම අනුමැතිය අපේක්ෂාවෙන්</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-[#B45309] border border-[#FDE68A]">
                Pending Verification
              </span>
            </div>
            <p className="text-xs text-[#78350F] mt-1 max-w-3xl leading-relaxed">
              Your salon registration has been received and is currently awaiting Super Admin review.
              Until verified and approved, adding new branches, stylists, services, and taking bookings are{" "}
              <strong className="text-[#0F172A] underline underline-offset-2">strictly locked</strong>.
              Your dashboard is in read-only preview mode.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            onClick={() => refreshStatus()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
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
      <div className="mb-6 p-4 sm:p-5 rounded-[22px] bg-[#FEE2E2]/90 border border-[#FECACA] text-[#991B1B] shadow-[0_8px_24px_rgba(185,28,28,0.08)] flex items-start gap-3.5 animate-fadeIn">
        <div className="w-10 h-10 rounded-xl bg-white border border-[#FECACA] flex items-center justify-center text-[#DC2626] shrink-0 mt-0.5">
          <XCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-extrabold text-sm text-[#0F172A]">Registration Rejected</h3>
          <p className="text-xs text-[#991B1B] mt-1">
            This salon registration was rejected by the Super Admin. You cannot create branches, staff, or take appointments. Please contact platform support.
          </p>
        </div>
      </div>
    );
  }

  if (status === "SUSPENDED") {
    return (
      <div className="mb-6 p-4 sm:p-5 rounded-[22px] bg-[#FFEDD5]/90 border border-[#FED7AA] text-[#9A3412] shadow-[0_8px_24px_rgba(234,88,12,0.08)] flex items-start gap-3.5 animate-fadeIn">
        <div className="w-10 h-10 rounded-xl bg-white border border-[#FED7AA] flex items-center justify-center text-[#EA580C] shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-extrabold text-sm text-[#0F172A]">Account Suspended</h3>
          <p className="text-xs text-[#9A3412] mt-1">
            This salon account has been suspended by platform administration. All booking creation and modification features are locked.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
