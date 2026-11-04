"use client";

import { useEffect, useState } from "react";
import { CalendarOff, Clock } from "lucide-react";
import { useT } from "@/context/I18nContext";
import type { MessageKey } from "@/lib/i18n/messages";
import { useMyStaff } from "@/components/admin/useMyStaff";
import { Banner, EmptyState, PageLoading, Panel } from "@/components/admin/ui";

export default function MySchedulePage() {
  const { t } = useT();
  const me = useMyStaff();
  const [staff, setStaff] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!me.staffId) return;
    fetch(`/api/staff/${me.staffId}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || t("common.errorGeneric"));
        setStaff(j.staff);
      })
      .catch((e) => setError(e.message));
  }, [me.staffId, t]);

  if (me.loading) return <PageLoading label={t("common.loading")} />;
  if (!me.staffId) return <Banner kind="info">{t("dash.noStaffProfile")}</Banner>;
  if (error) return <Banner kind="error">{error}</Banner>;
  if (!staff) return <PageLoading label={t("common.loading")} />;

  const todayDow = new Date().getDay();
  const byDay = new Map<number, any>((staff.schedules || []).map((s: any) => [s.dayOfWeek, s]));
  const todayStr = new Date().toISOString().slice(0, 10);
  const leaves = (staff.leaves || []).filter((l: any) => String(l.endDate).slice(0, 10) >= todayStr).reverse();
  // Show Monday first
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="space-y-6 w-full">
      <Panel title={t("my.weeklyHours")}>
        <ul className="divide-y divide-white/10">
          {order.map((d) => {
            const s = byDay.get(d);
            const working = s?.isWorking;
            return (
              <li
                key={d}
                className={`py-3.5 px-3 flex items-center justify-between rounded-lg ${d === todayDow ? "bg-[#8B5CF6]/15" : ""}`}
              >
                <span className="text-base font-semibold text-white">
                  {t(`day.${d}` as MessageKey)}
                  {d === todayDow && <span className="ml-2 text-sm text-[#C4B5FD]">({t("common.today")})</span>}
                </span>
                {working ? (
                  <span className="inline-flex items-center gap-1.5 text-base text-white"><Clock className="w-4 h-4 text-[#A78BFA]" aria-hidden />{s.startTime} - {s.endTime}</span>
                ) : (
                  <span className="text-base text-[#9CA3AF]">{t("dash.dayOff")}</span>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title={t("my.leave")}>
        {leaves.length === 0 ? (
          <EmptyState icon={CalendarOff} text={t("my.noLeave")} />
        ) : (
          <ul className="space-y-2">
            {leaves.map((l: any) => (
              <li key={l.id} className="rounded-xl bg-[#131524] border border-white/10 p-3 text-base text-white">
                {String(l.startDate).slice(0, 10)}
                {String(l.endDate).slice(0, 10) !== String(l.startDate).slice(0, 10) && ` → ${String(l.endDate).slice(0, 10)}`}
                <span className="ml-2 text-sm text-[#D1D5DB]">
                  {l.approved ? t("my.approved") : t("my.waitingApproval")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

