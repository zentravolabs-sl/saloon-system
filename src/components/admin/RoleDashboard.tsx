"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/context/I18nContext";
import { Banner, PageLoading, btnSecondary } from "@/components/admin/ui";
import {
  FrontDeskDashboard, ManagerDashboard, OwnerDashboard, StaffDashboard,
} from "@/components/admin/dashboards";

/** Loads the role-specific dashboard payload and renders the matching layout */
export function RoleDashboard() {
  const { t } = useT();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("common.errorGeneric"));
      setData(json);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.errorGeneric"));
    }
  }, [t]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000); // keep the front desk view fresh
    return () => clearInterval(id);
  }, [load]);

  if (error && !data) {
    return (
      <div className="max-w-xl space-y-4">
        <Banner kind="error">{error}</Banner>
        <button className={btnSecondary} onClick={load}>{t("common.tryAgain")}</button>
      </div>
    );
  }
  if (!data) return <PageLoading label={t("common.loading")} />;

  switch (data.kind) {
    case "frontdesk": return <FrontDeskDashboard data={data} reload={load} />;
    case "manager": return <ManagerDashboard data={data} reload={load} />;
    case "staff": return <StaffDashboard data={data} reload={load} />;
    default: return <OwnerDashboard data={data} reload={load} />;
  }
}

