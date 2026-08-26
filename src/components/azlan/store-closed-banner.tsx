"use client";

import { useStoreStatus } from "@/hooks/use-store-status";
import { formatCountdown } from "@/lib/store-hours";

/**
 * The "we're closed" strip.
 *
 * Rewritten for phones: one line at 375px instead of a wrapping four-element
 * dark bar, and a real "opens in 2h 15m" countdown rather than a hardcoded
 * "7:00 PM – 4:00 AM" that contradicted the row in `settings`. It also no longer
 * runs its own realtime channel and 15-second interval — the shared store status
 * does that once for the page (src/hooks/use-store-status.tsx).
 */
export function StoreClosedBanner() {
  const status = useStoreStatus();

  if (status.isOpen) return null;

  const closedByAdmin = status.mode === "force_closed";
  const countdown = formatCountdown(status.minutesUntilOpen);

  return (
    <aside
      aria-label="Restaurant closed notice"
      className="relative z-[150] w-full border-b border-amber-300 bg-amber-50 text-amber-950"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs sm:gap-3 sm:py-2.5 sm:text-sm">
        {/* One line, always. The long form only appears where there is room. */}
        <p className="min-w-0 flex-1 truncate font-bold">
          <span className="font-black">Closed right now</span>
          {closedByAdmin ? (
            <span className="font-semibold text-amber-800">
              {" · "}Online orders are paused
              <span className="hidden sm:inline"> — please check back shortly</span>
            </span>
          ) : (
            <span className="font-semibold text-amber-800">
              {" · "}Opens in {countdown}
              <span className="hidden sm:inline">
                {" "}({status.operatingHoursText})
              </span>
            </span>
          )}
        </p>

        <span className="hidden shrink-0 rounded-lg bg-white/70 px-2 py-0.5 text-[11px] font-bold text-amber-800 lg:inline">
          PKT {status.currentTimePkt}
        </span>
      </div>
    </aside>
  );
}
