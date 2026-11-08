import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div
      className="min-h-screen text-[#0F172A] flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(circle at 10% 10%, #F5F3FF 0%, #EEF0F9 45%, #E9ECF8 100%)",
      }}
    >
      <div className="max-w-md w-full p-8 rounded-[24px] bg-white/95 border border-white shadow-[0_10px_32px_rgba(15,23,42,0.06)] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-[#0F172A]">Access Restricted</h1>
        <p className="text-xs text-[#475569] leading-relaxed">
          You do not have the required role or salon permissions to access this administrative section.
        </p>
        <div className="pt-4 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <Link
            href="/auth/login"
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_6px_16px_rgba(124,58,237,0.28)]"
          >
            Sign In with Another Account
          </Link>
        </div>
      </div>
    </div>
  );
}
