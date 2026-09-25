import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#0A0B14] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white">Access Restricted</h1>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          You do not have the required role or salon permissions to access this administrative section.
        </p>
        <div className="pt-4 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
          <Link
            href="/auth/login"
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white"
          >
            Sign In with Another Account
          </Link>
        </div>
      </div>
    </div>
  );
}
