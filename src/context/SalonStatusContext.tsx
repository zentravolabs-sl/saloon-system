"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface SalonStatusData {
  id: string;
  name: string;
  slug: string;
  status: string; // "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "INACTIVE"
  isApproved: boolean;
  createdAt?: string;
}

interface SalonStatusContextValue {
  salon: SalonStatusData | null;
  status: string | null;
  isApproved: boolean;
  loading: boolean;
  refreshStatus: () => Promise<void>;
}

const SalonStatusContext = createContext<SalonStatusContextValue>({
  salon: null,
  status: null,
  isApproved: true,
  loading: false,
  refreshStatus: async () => {},
});

export function SalonStatusProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [salon, setSalon] = useState<SalonStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    if (session.user.role === "SUPER_ADMIN") {
      setSalon({
        id: "super-admin",
        name: "Platform Super Admin",
        slug: "platform",
        status: "APPROVED",
        isApproved: true,
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/salon-status");
      if (res.ok) {
        const data = await res.json();
        if (data.salon) {
          setSalon(data.salon);
        }
      }
    } catch (err) {
      console.error("Failed to load salon status", err);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const rawStatus = salon?.status ?? (session?.user as any)?.salonStatus ?? null;
  const isApproved =
    salon?.isApproved ??
    ((session?.user as any)?.salonStatus === "APPROVED" || session?.user?.role === "SUPER_ADMIN");

  const value: SalonStatusContextValue = {
    salon,
    status: rawStatus,
    isApproved: Boolean(isApproved),
    loading,
    refreshStatus: fetchStatus,
  };

  return (
    <SalonStatusContext.Provider value={value}>
      {children}
    </SalonStatusContext.Provider>
  );
}

export function useSalonStatus() {
  return useContext(SalonStatusContext);
}
