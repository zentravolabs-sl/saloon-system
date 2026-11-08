"use client";

import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { useT } from "@/context/I18nContext";
import { useMyStaff } from "@/components/admin/useMyStaff";
import { Banner, EmptyState, PageLoading, Panel, StatCard, formatMoney } from "@/components/admin/ui";

export default function MyCommissionsPage() {
  const { t } = useT();
  const me = useMyStaff();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!me.staffId) return;
    fetch("/api/commissions/entries?limit=50", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || t("common.errorGeneric"));
        setData(j);
      })
      .catch((e) => setError(e.message));
  }, [me.staffId, t]);

  if (me.loading) return <PageLoading label={t("common.loading")} />;
  if (!me.staffId) return <Banner kind="info">{t("dash.noStaffProfile")}</Banner>;
  if (error) return <Banner kind="error">{error}</Banner>;
  if (!data) return <PageLoading label={t("common.loading")} />;

  const entries = (data.entries || []).filter((e: any) => e.status !== "VOIDED");
  const cur = me.currency;

  return (
    <div className="space-y-6 w-full">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t("dash.earnedPending")} value={formatMoney(Number(data.totals.pending), cur)} />
        <StatCard label={t("dash.earnedApproved")} value={formatMoney(Number(data.totals.approved), cur)} />
        <StatCard label={t("dash.earnedPaid")} value={formatMoney(Number(data.totals.paid), cur)} tone="good" />
      </div>

      <Panel title={t("my.recentEarnings")}>
        {entries.length === 0 ? (
          <EmptyState icon={Award} text={t("my.noEarnings")} />
        ) : (
          <ul className="divide-y divide-[#E2E8F0]">
            {entries.map((e: any) => (
              <li key={e.id} className="py-3 flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-[#0F172A] truncate">{e.description}</p>
                  <p className="text-sm text-[#64748B]">{String(e.earnedAt).slice(0, 10)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold text-[#0F172A]">{formatMoney(Number(e.amount), cur)}</p>
                  <p className="text-sm text-[#334155]">
                    {e.status === "PAID" ? t("dash.earnedPaid") : e.status === "APPROVED" ? t("dash.earnedApproved") : t("dash.earnedPending")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

