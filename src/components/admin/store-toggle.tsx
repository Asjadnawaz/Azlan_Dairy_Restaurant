"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FORCE_OPEN_GRACE_MS,
  type StoreOpenMode,
  type StoreStatusPayload,
} from "@/lib/store-hours";

/**
 * The admin's store control — three states, not a switch.
 *
 * A boolean could only ever close the shop early; there was no way to open up
 * outside 7 PM–4 AM. The three modes are:
 *
 *   Auto     — follow the schedule (the normal state)
 *   Open now — override the schedule, for 30 minutes at a time
 *   Closed   — override the schedule the other way, no expiry
 *
 * "Open now" expires on purpose. While this component is mounted it sends a
 * heartbeat that pushes the expiry forward, so the shop stays open as long as
 * someone is actually watching the dashboard; close the tab or sign out and the
 * next read of the status retires the override. Without that, one late-night
 * force-open would leave the shop taking orders until morning.
 *
 * The countdown shown is the local view of that grace — the server is the
 * authority, and it is re-read on every heartbeat response.
 */

/** Comfortably inside the 30-minute grace, and cheap: one request every 5 min. */
const HEARTBEAT_MS = 5 * 60 * 1000;
/** How often the visible countdown ticks down. */
const COUNTDOWN_TICK_MS = 30 * 1000;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatGrace(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 1) return "under a minute";
  return `${mins} min`;
}

type ToggleResponse = {
  mode?: StoreOpenMode;
  status?: StoreStatusPayload;
  degraded?: string;
  detail?: string;
  error?: string;
};

const MODES: {
  mode: StoreOpenMode;
  label: string;
  short: string;
  icon: string;
  activeClass: string;
}[] = [
  {
    mode: "auto",
    label: "Auto",
    short: "Auto",
    icon: "schedule",
    activeClass: "bg-[var(--color-primary)] text-white",
  },
  {
    mode: "force_open",
    label: "Open now",
    short: "Open",
    icon: "store",
    activeClass: "bg-[var(--color-success)] text-white",
  },
  {
    mode: "force_closed",
    label: "Closed",
    short: "Closed",
    icon: "lock",
    activeClass: "bg-[var(--color-error)] text-white",
  },
];

export function StoreToggle({
  mode: modeProp,
  forceOpenExpiresInMs,
  hoursText,
  onModeChange,
}: {
  mode: StoreOpenMode;
  /** Grace left on a live force-open, from the server. null when there is none. */
  forceOpenExpiresInMs: number | null;
  /** e.g. "7:00 PM – 4:00 AM", derived from open_hour/close_hour. */
  hoursText: string;
  /** Optimistic parent update; called again with the old value if the write fails. */
  onModeChange: (mode: StoreOpenMode) => void;
}) {
  const [updating, setUpdating] = useState<StoreOpenMode | null>(null);
  const [graceMs, setGraceMs] = useState<number | null>(forceOpenExpiresInMs);

  // The server's number wins whenever it changes; the local tick only fills the
  // gaps between heartbeats.
  const [prevGrace, setPrevGrace] = useState(forceOpenExpiresInMs);
  if (forceOpenExpiresInMs !== prevGrace) {
    setPrevGrace(forceOpenExpiresInMs);
    setGraceMs(forceOpenExpiresInMs);
  }

  const send = useCallback(
    async (body: Record<string, unknown>): Promise<ToggleResponse | null> => {
      const res = await fetch("/api/admin/toggle-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ToggleResponse;
      if (!res.ok) throw new Error(data.error || "Failed to update store status");
      return data;
    },
    []
  );

  async function choose(next: StoreOpenMode) {
    if (updating || next === modeProp) return;
    setUpdating(next);
    const previous = modeProp;
    onModeChange(next);

    try {
      const data = await send({ mode: next });

      if (data?.degraded === "missing_columns") {
        // Only the boolean landed — say so rather than showing a countdown that
        // is not really running.
        toast.warning("Saved as open/closed only", { description: data.detail });
        setGraceMs(null);
      } else {
        setGraceMs(data?.status?.forceOpenExpiresInMs ?? null);
        if (next === "force_open") {
          toast.success("Store forced OPEN", {
            description: `Stays open while this dashboard is in use, then returns to the schedule (${hoursText}).`,
          });
        } else if (next === "force_closed") {
          toast.success("Store forced CLOSED", {
            description: "Customers cannot order until you switch back.",
          });
        } else {
          toast.success("Following the schedule", { description: hoursText });
        }
      }
    } catch (err: unknown) {
      onModeChange(previous);
      toast.error(getErrorMessage(err, "Failed to update store status"));
    } finally {
      setUpdating(null);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Heartbeat + countdown                                                  */
  /* ---------------------------------------------------------------------- */

  const isForceOpen = modeProp === "force_open";

  useEffect(() => {
    if (!isForceOpen) return;

    const beat = async () => {
      // A backgrounded tab is not "someone watching the dashboard" — that is
      // precisely the case the expiry exists for.
      if (document.visibilityState !== "visible") return;
      try {
        const data = await send({ heartbeat: true });
        setGraceMs(data?.status?.forceOpenExpiresInMs ?? null);
      } catch {
        // A missed heartbeat is not worth a toast: the next one covers it, and
        // if they all fail the override lapses, which is the safe direction.
      }
    };

    const id = setInterval(() => void beat(), HEARTBEAT_MS);
    return () => clearInterval(id);
    // `send` has no dependencies of its own, so this interval is built once per
    // force-open rather than on every parent render.
  }, [isForceOpen, send]);

  useEffect(() => {
    if (!isForceOpen) return;
    const id = setInterval(() => {
      setGraceMs((ms) => (ms === null ? null : Math.max(0, ms - COUNTDOWN_TICK_MS)));
    }, COUNTDOWN_TICK_MS);
    return () => clearInterval(id);
  }, [isForceOpen]);

  async function extend() {
    if (updating) return;
    setUpdating("force_open");
    try {
      const data = await send({ mode: "force_open" });
      setGraceMs(data?.status?.forceOpenExpiresInMs ?? FORCE_OPEN_GRACE_MS);
      toast.success("Force-open extended");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Could not extend"));
    } finally {
      setUpdating(null);
    }
  }

  /* ---------------------------------------------------------------------- */

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <div
        role="radiogroup"
        aria-label="Store availability"
        className="flex items-center gap-1 rounded-full bg-[var(--color-surface-container)] p-1"
      >
        {MODES.map((m) => {
          const selected = modeProp === m.mode;
          const busy = updating === m.mode;
          return (
            <button
              key={m.mode}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={updating !== null}
              onClick={() => void choose(m.mode)}
              title={
                m.mode === "auto"
                  ? `Follow the schedule (${hoursText})`
                  : m.mode === "force_open"
                    ? "Take orders now, even outside opening hours"
                    : "Stop taking orders, even during opening hours"
              }
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 sm:text-sm ${
                selected
                  ? m.activeClass
                  : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                {busy ? "progress_activity" : m.icon}
              </span>
              <span className="hidden sm:inline">{m.label}</span>
              <span className="sm:hidden">{m.short}</span>
            </button>
          );
        })}
      </div>

      {/* One line of plain English about what the chosen mode actually means. */}
      {modeProp === "force_open" ? (
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-1 text-[11px] font-semibold text-[var(--color-on-surface-variant)]">
          <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
            timer
          </span>
          {graceMs === null
            ? "Open now — returns to the schedule when you leave."
            : `Returns to the schedule in ${formatGrace(graceMs)}`}
          <button
            type="button"
            onClick={() => void extend()}
            disabled={updating !== null}
            className="font-bold text-[var(--color-primary)] underline underline-offset-2 disabled:opacity-60"
          >
            Extend
          </button>
        </p>
      ) : (
        <p className="px-1 text-[11px] font-semibold text-[var(--color-on-surface-variant)]">
          {modeProp === "force_closed"
            ? "Closed — customers cannot place orders."
            : `Open ${hoursText}`}
        </p>
      )}
    </div>
  );
}
