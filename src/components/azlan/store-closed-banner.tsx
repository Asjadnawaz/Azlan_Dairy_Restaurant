"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Settings } from "@/lib/supabase/database.types";

export function StoreClosedBanner({ isActive }: { isActive: boolean }) {
  const [storeActive, setStoreActive] = useState<boolean>(isActive);

  useEffect(() => {
    setStoreActive(isActive);
  }, [isActive]);

  // Fetch current status directly from DB
  const fetchStatus = useCallback(async () => {
    try {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("settings")
        .select("is_active")
        .eq("id", 1)
        .single();
      if (data && typeof data.is_active === "boolean") {
        setStoreActive(data.is_active);
      }
    } catch {
      // Silent fallback
    }
  }, []);

  useEffect(() => {
    // Fetch fresh status on mount
    fetchStatus();

    // Subscribe to Realtime changes
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("banner-store-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings" },
        (payload) => {
          const updated = payload.new as Settings;
          if (updated && typeof updated.is_active === "boolean") {
            setStoreActive(updated.is_active);
          }
        }
      )
      .subscribe();

    // Polling fallback every 30s
    const interval = setInterval(fetchStatus, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchStatus]);

  if (storeActive) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2
                 bg-error/10 text-error px-4 py-2.5 text-sm font-semibold backdrop-blur-sm
                 animate-fade-in border-b border-error/20"
      role="alert"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
        storefront
      </span>
      <span>
        We&apos;re currently closed for online orders. Please try again later.
      </span>
    </div>
  );
}
