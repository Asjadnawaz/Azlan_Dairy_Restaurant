"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Settings } from "@/lib/supabase/database.types";
import { getStoreOpenStatus, isWithinOperatingHours, getKarachiCurrentTime } from "@/lib/store-hours";

export function StoreClosedBanner({ isActive }: { isActive: boolean }) {
  const [adminActiveOverride, setAdminActiveOverride] = useState<boolean | null>(null);
  const [currentTimePkt, setCurrentTimePkt] = useState<string>("");
  const [isHoursOpen, setIsHoursOpen] = useState<boolean>(true);

  // Fetch current database admin setting
  const fetchAdminStatus = useCallback(async () => {
    try {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("settings")
        .select("is_active")
        .eq("id", 1)
        .single();
      if (data && typeof data.is_active === "boolean") {
        setAdminActiveOverride(data.is_active);
      }
    } catch {
      // Silent fallback
    }
  }, []);

  // Update time and open-hours check
  const updateTimingCheck = useCallback(() => {
    const now = new Date();
    setIsHoursOpen(isWithinOperatingHours(now));
    setCurrentTimePkt(getKarachiCurrentTime(now));
  }, []);

  useEffect(() => {
    updateTimingCheck();
    void fetchAdminStatus();

    // Subscribe to database settings changes (Admin Toggle)
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("banner-store-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings" },
        (payload) => {
          const updated = payload.new as Settings;
          if (updated && typeof updated.is_active === "boolean") {
            setAdminActiveOverride(updated.is_active);
          }
        }
      )
      .subscribe();

    // Check time every 15 seconds so transitions at 7:00 PM and 4:00 AM happen automatically
    const interval = setInterval(() => {
      updateTimingCheck();
      void fetchAdminStatus();
    }, 15_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchAdminStatus, updateTimingCheck]);

  const effectiveAdminActive = adminActiveOverride ?? isActive ?? true;
  const storeStatus = getStoreOpenStatus(effectiveAdminActive);

  // If store is open (both within 7 PM - 4 AM AND not disabled by admin), hide the banner
  if (storeStatus.isOpen) {
    return null;
  }

  const isClosedByAdmin = storeStatus.reason === "closed_by_admin";

  return (
    <aside
      aria-label="Restaurant Closed Notification"
      className="relative z-[150] w-full bg-gradient-to-r from-slate-950 via-[#1c0f04] to-slate-950 text-white border-b border-amber-500/30 shadow-xl backdrop-blur-md animate-fade-in"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 text-xs sm:text-sm">
        {/* Left: Status badge & Main Message */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="material-symbols-outlined text-[15px]">nightlight</span>
            <span>Closed Right Now</span>
          </span>

          <span className="font-bold text-slate-200 text-xs sm:text-sm leading-snug">
            {isClosedByAdmin
              ? "We are currently paused for online orders. Please check back shortly."
              : "We are currently closed for delivery. Hot & crispy orders open at 7:00 PM!"}
          </span>
        </div>

        {/* Right: Operating Hours Badge */}
        <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 text-xs font-extrabold shadow-inner">
            <span className="material-symbols-outlined text-[16px] text-[#FFC700]">
              schedule
            </span>
            <span className="text-slate-400 font-semibold hidden md:inline">Hours:</span>
            <span className="text-white font-black">7:00 PM – 4:00 AM</span>
          </div>

          {currentTimePkt && (
            <span className="text-[11px] text-slate-400 font-semibold hidden lg:inline bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
              PKT: {currentTimePkt}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
