"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Phone, User } from "lucide-react";
import { useT } from "@/context/I18nContext";
import type { MessageKey } from "@/lib/i18n/messages";
import { StatusBadge, btnSmall, formatMoney } from "@/components/admin/ui";

export interface DashAppointment {
  id: string;
  reference: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  total: number;
  balance: number;
  customerName: string;
  customerPhone: string;
  staffId: string;
  staffName: string;
  branchName: string;
  services: string[];
}

type Action = { label: MessageKey; next?: string; href?: string };

export function nextActionFor(a: DashAppointment, canBill: boolean, canConfirm: boolean): Action | null {
  switch (a.status) {
    case "PENDING":
      return canConfirm ? { label: "act.confirm", next: "CONFIRMED" } : null;
    case "CONFIRMED":
      return { label: "act.checkIn", next: "CHECKED_IN" };
    case "CHECKED_IN":
      return { label: "act.start", next: "IN_PROGRESS" };
    case "IN_PROGRESS":
      return { label: "act.finish", next: "COMPLETED" };
    case "COMPLETED":
      return canBill && a.paymentStatus !== "PAID"
        ? { label: "act.pay", href: `/admin/billing?booking=${a.id}` }
        : null;
    default:
      return null;
  }
}

export function AppointmentRow({
  appt,
  canBill = false,
  canConfirm = true,
  showStaff = true,
  onChanged,
  onMessage,
}: {
  appt: DashAppointment;
  canBill?: boolean;
  canConfirm?: boolean;
  showStaff?: boolean;
  onChanged?: () => void;
  onMessage?: (kind: "success" | "error", text: string) => void;
}) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const action = nextActionFor(appt, canBill, canConfirm);

  const update = async (status: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onMessage?.("error", data.error || t("act.failed"));
      } else {
        onMessage?.("success", t("act.updated"));
        onChanged?.();
      }
    } catch {
      onMessage?.("error", t("act.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between hover:bg-[#F1F5F9]/70 transition-colors">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-lg font-extrabold text-[#0F172A]">
            <Clock className="w-4 h-4 text-[#7C3AED]" aria-hidden />
            {appt.startTime}
          </span>
          <StatusBadge status={appt.status} />
        </div>
        <p className="text-base font-bold text-[#0F172A] flex items-center gap-1.5">
          <User className="w-4 h-4 text-[#64748B]" aria-hidden />
          <span className="truncate">{appt.customerName}</span>
        </p>
        <p className="text-sm font-medium text-[#475569]">
          {appt.services.join(", ")}
          {showStaff ? ` · ${appt.staffName}` : ""}
        </p>
        <p className="text-sm text-[#64748B] flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" aria-hidden />
          {appt.customerPhone}
          {appt.status === "COMPLETED" && appt.balance > 0 && (
            <span className="ml-2 text-[#D97706] font-bold">{formatMoney(appt.balance)}</span>
          )}
        </p>
      </div>
      {action &&
        (action.href ? (
          <Link href={action.href} className={btnSmall}>
            {t(action.label)}
          </Link>
        ) : (
          <button className={btnSmall} disabled={busy} onClick={() => update(action.next!)}>
            {t(action.label)}
          </button>
        ))}
    </li>
  );
}
