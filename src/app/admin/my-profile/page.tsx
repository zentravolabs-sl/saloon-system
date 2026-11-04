"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useT } from "@/context/I18nContext";
import type { MessageKey } from "@/lib/i18n/messages";
import { useMyStaff } from "@/components/admin/useMyStaff";
import { Banner, PageLoading, Panel } from "@/components/admin/ui";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-3 flex justify-between gap-4 border-b border-white/10 last:border-0">
      <dt className="text-base text-[#D1D5DB]">{label}</dt>
      <dd className="text-base font-semibold text-white text-right">{value || "—"}</dd>
    </div>
  );
}

export default function MyProfilePage() {
  const { t } = useT();
  const { data: session } = useSession();
  const me = useMyStaff();
  const [staff, setStaff] = useState<any>(null);

  useEffect(() => {
    if (!me.staffId) return;
    fetch(`/api/staff/${me.staffId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setStaff(j.staff || null))
      .catch(() => setStaff(null));
  }, [me.staffId]);

  if (me.loading) return <PageLoading label={t("common.loading")} />;

  return (
    <div className="space-y-6 max-w-2xl">
      <Panel title={t("nav.myProfile")}>
        <dl>
          <Row label={t("my.name")} value={session?.user?.name} />
          <Row label="Email" value={session?.user?.email} />
          <Row label={t("my.role")} value={session?.user?.role ? t(`role.${session.user.role}` as MessageKey) : ""} />
          {staff && (
            <>
              <Row label={t("book.customerPhone")} value={staff.phone} />
              <Row label={t("my.speciality")} value={staff.specialization} />
              <Row label={t("book.branch")} value={staff.branches?.map((b: any) => b.branch?.name).filter(Boolean).join(", ")} />
              <Row label={t("nav.services")} value={staff.services?.map((s: any) => s.service?.name).filter(Boolean).join(", ")} />
            </>
          )}
        </dl>
      </Panel>
      {!me.staffId && <Banner kind="info">{t("dash.noStaffProfile")}</Banner>}
      <p className="text-base text-[#D1D5DB]">{t("my.askOwnerToChange")}</p>
    </div>
  );
}

