"use client";

import { useEffect, useState } from "react";

export interface MyContext {
  loading: boolean;
  staffId: string | null;
  currency: string;
  userName: string;
  error: string;
}

/** Who am I? Resolved by the server from the session (never from the browser). */
export function useMyStaff(): MyContext {
  const [state, setState] = useState<MyContext>({
    loading: true, staffId: null, currency: "LKR", userName: "", error: "",
  });
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ops/meta", { cache: "no-store" })
      .then(async (res) => {
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Error");
        if (!cancelled)
          setState({
            loading: false,
            staffId: j.user?.staffId ?? null,
            currency: j.currency || "LKR",
            userName: j.user?.name || "",
            error: "",
          });
      })
      .catch((e) => !cancelled && setState((s) => ({ ...s, loading: false, error: String(e.message || e) })));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

