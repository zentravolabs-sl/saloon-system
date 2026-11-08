"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, Inbox, Loader2 } from "lucide-react";
import { useT } from "@/context/I18nContext";
import type { MessageKey } from "@/lib/i18n/messages";

/** Shared building blocks styled with the HomePage light lavender/slate palette */

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-5 min-h-12 rounded-xl text-base font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_6px_16px_rgba(124,58,237,0.28)] hover:brightness-105 active:bg-[#5B21B6] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] transition-all";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 px-5 min-h-12 rounded-xl text-base font-semibold bg-white text-[#0F172A] border border-[#E2E8F0] shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] transition-colors";
export const btnSmall =
  "inline-flex items-center justify-center gap-1.5 px-4 min-h-11 rounded-lg text-sm font-bold bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] transition-all";
export const inputClass =
  "w-full min-h-12 px-4 rounded-xl bg-white border border-[#E2E8F0] text-base text-[#0F172A] placeholder:text-[#64748B] shadow-[0_2px_6px_rgba(15,23,42,0.02)] focus:outline-2 focus:outline-[#7C3AED] focus:border-[#7C3AED]";
export const labelClass = "block text-sm font-semibold text-[#334155] mb-1.5";

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
    <section className="rounded-[22px] bg-white/95 backdrop-blur-md border border-white shadow-[0_8px_28px_rgba(15,23,42,0.04)] p-4 sm:p-5">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="text-lg font-extrabold text-[#0F172A] tracking-tight">{title}</h2>}
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
    default: "border-white",
    good: "border-[#BBF7D0]",
    warn: "border-[#FDE68A]",
    bad: "border-[#FECACA]",
  } as const;
  const inner = (
    <div className={`h-full rounded-[22px] bg-white/95 backdrop-blur-md border ${tones[tone]} shadow-[0_8px_24px_rgba(15,23,42,0.04)] p-4 sm:p-5`}>
      <div className="flex items-center gap-2 text-sm font-bold text-[#475569]">
        {Icon && <Icon className="w-5 h-5 text-[#7C3AED]" aria-hidden />}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-3xl font-extrabold text-[#0F172A] break-words">{value}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block focus-visible:outline-2 focus-visible:outline-[#7C3AED] rounded-[22px]">
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
      <div className="w-12 h-12 rounded-full bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED]">
        <Icon className="w-6 h-6" aria-hidden />
      </div>
      <p className="text-base font-medium text-[#475569] max-w-md">{text}</p>
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
    success: "bg-[#DCFCE7] border-[#BBF7D0] text-[#15803D]",
    error: "bg-[#FEE2E2] border-[#FECACA] text-[#B91C1C]",
    info: "bg-[#DBEAFE] border-[#BFDBFE] text-[#1D4ED8]",
  } as const;
  const Icon = kind === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-base font-medium ${styles[kind]}`}
    >
      <Icon className="w-5 h-5 mt-0.5 shrink-0" aria-hidden />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} className="font-bold px-2 min-h-8" aria-label="Close">
          ×
        </button>
      )}
    </div>
  );
}

export function PageLoading({ label }: { label: string }) {
  return (
    <div className="py-24 flex items-center justify-center gap-3 text-base font-medium text-[#475569]" role="status">
      <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#D97706]",
  CONFIRMED: "bg-[#DBEAFE] text-[#1D4ED8]",
  CHECKED_IN: "bg-[#EDE9FE] text-[#6D28D9]",
  IN_PROGRESS: "bg-[#EDE9FE] text-[#6D28D9]",
  COMPLETED: "bg-[#DCFCE7] text-[#15803D]",
  CANCELLED: "bg-[#FEE2E2] text-[#B91C1C]",
  REJECTED: "bg-[#FEE2E2] text-[#B91C1C]",
  NO_SHOW: "bg-[#F1F5F9] text-[#475569]",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useT();
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[status] || "bg-[#F1F5F9] text-[#334155]"}`}>
      {t(`status.${status}` as MessageKey)}
    </span>
  );
}
