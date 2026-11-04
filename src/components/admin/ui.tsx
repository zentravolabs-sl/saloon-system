"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, Inbox, Loader2 } from "lucide-react";
import { useT } from "@/context/I18nContext";
import type { MessageKey } from "@/lib/i18n/messages";

/** Shared, deliberately plain building blocks: big text, big buttons, high contrast. */

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-5 min-h-12 rounded-xl text-base font-bold bg-[#8B5CF6] text-white hover:bg-[#7C3AED] active:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 px-5 min-h-12 rounded-xl text-base font-semibold bg-white/10 text-white border border-white/15 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors";
export const btnSmall =
  "inline-flex items-center justify-center gap-1.5 px-4 min-h-11 rounded-lg text-sm font-bold bg-[#8B5CF6] text-white hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors";
export const inputClass =
  "w-full min-h-12 px-4 rounded-xl bg-[#131524] border border-white/20 text-base text-white placeholder:text-[#9CA3AF] focus:outline-2 focus:outline-[#A78BFA] focus:border-[#A78BFA]";
export const labelClass = "block text-sm font-semibold text-[#E5E7EB] mb-1.5";

export function formatMoney(value: number, currency = "LKR") {
  return `${currency} ${Math.round(value * 100) / 100 === Math.round(value) ? Math.round(value).toLocaleString() : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function Panel({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-[#10121E] border border-white/10 p-4 sm:p-5">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="text-lg font-bold text-white">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  tone = "default",
  icon: Icon,
  href,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
  icon?: LucideIcon;
  href?: string;
}) {
  const tones = {
    default: "border-white/10",
    good: "border-emerald-500/40",
    warn: "border-amber-500/40",
    bad: "border-red-500/40",
  } as const;
  const inner = (
    <div className={`h-full rounded-2xl bg-[#10121E] border ${tones[tone]} p-4 sm:p-5`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-[#D1D5DB]">
        {Icon && <Icon className="w-5 h-5 text-[#A78BFA]" aria-hidden />}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-3xl font-extrabold text-white break-words">{value}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block focus-visible:outline-2 focus-visible:outline-[#A78BFA] rounded-2xl">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function EmptyState({
  text,
  icon: Icon = Inbox,
  action,
}: {
  text: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-8 px-4 text-center flex flex-col items-center gap-3">
      <Icon className="w-10 h-10 text-[#6B7280]" aria-hidden />
      <p className="text-base text-[#D1D5DB] max-w-md">{text}</p>
      {action}
    </div>
  );
}

export function Banner({
  kind,
  children,
  onClose,
}: {
  kind: "success" | "error" | "info";
  children: React.ReactNode;
  onClose?: () => void;
}) {
  const styles = {
    success: "bg-emerald-500/15 border-emerald-500/40 text-emerald-100",
    error: "bg-red-500/15 border-red-500/40 text-red-100",
    info: "bg-blue-500/15 border-blue-500/40 text-blue-100",
  } as const;
  const Icon = kind === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-base ${styles[kind]}`}
    >
      <Icon className="w-5 h-5 mt-0.5 shrink-0" aria-hidden />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} className="font-bold px-2 min-h-8" aria-label="�">
          ×
        </button>
      )}
    </div>
  );
}

export function PageLoading({ label }: { label: string }) {
  return (
    <div className="py-24 flex items-center justify-center gap-3 text-base text-[#D1D5DB]" role="status">
      <Loader2 className="w-6 h-6 animate-spin text-[#A78BFA]" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-100",
  CONFIRMED: "bg-blue-500/20 text-blue-100",
  CHECKED_IN: "bg-purple-500/25 text-purple-100",
  IN_PROGRESS: "bg-cyan-500/20 text-cyan-100",
  COMPLETED: "bg-emerald-500/20 text-emerald-100",
  CANCELLED: "bg-red-500/20 text-red-100",
  REJECTED: "bg-red-500/20 text-red-100",
  NO_SHOW: "bg-zinc-500/25 text-zinc-100",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useT();
  return (
    <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-semibold ${STATUS_STYLES[status] || "bg-white/10 text-white"}`}>
      {t(`status.${status}` as MessageKey)}
    </span>
  );
}