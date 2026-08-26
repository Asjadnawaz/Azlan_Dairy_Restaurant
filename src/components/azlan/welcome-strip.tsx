"use client";

import { useState, useSyncExternalStore } from "react";
import { useStoreStatus } from "@/hooks/use-store-status";

/**
 * Replaces the old welcome modal.
 *
 * That modal blocked the whole page on arrival, carried `dark:` classes in a
 * light-only app, and ran its own realtime channel plus a 15-second interval —
 * three separate reasons to annoy someone before they had seen the menu. This is
 * a strip that sits in the flow under the header: it never covers content, it is
 * one tap to dismiss, it stays dismissed for a week, and every line on it is
 * true rather than promotional.
 */

const KEY = "azlan-welcome-seen";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Was it dismissed within the last week? */
function readSeen(): boolean {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < WEEK_MS;
  } catch {
    // Private mode with storage disabled: show it, don't crash.
    return false;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* nothing we can do, and nothing worth telling the customer */
  }
  for (const listener of listeners) listener();
}

export function WelcomeStrip({ deliveryFee }: { deliveryFee: number }) {
  // Hidden during SSR so returning customers never see it flash. It slides in
  // after hydration for anyone who has not dismissed it.
  const seen = useSyncExternalStore(subscribe, readSeen, () => true);
  const [closing, setClosing] = useState(false);
  const status = useStoreStatus();

  if (seen) return null;

  const facts = [
    { icon: "schedule", text: `Delivery ${status.operatingHoursText}` },
    { icon: "location_on", text: "Malir, Karachi" },
    {
      icon: deliveryFee > 0 ? "delivery_dining" : "local_shipping",
      text: deliveryFee > 0 ? `Delivery Rs. ${deliveryFee}` : "Affordable Delivery",
    },
    { icon: "payments", text: "Cash on delivery" },
  ];

  return (
    <div
      className={`overflow-hidden border-b border-emerald-100 bg-emerald-50/80 transition-all duration-300 ${
        closing ? "max-h-0 opacity-0" : "max-h-24 opacity-100"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <ul className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto text-[11px] font-bold text-emerald-900 sm:gap-5 sm:text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {facts.map((fact) => (
            <li key={fact.icon} className="flex shrink-0 items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                {fact.icon}
              </span>
              <span className="whitespace-nowrap">{fact.text}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => {
            setClosing(true);
            // Let the collapse play, then take it out of the tree for good.
            window.setTimeout(markSeen, 300);
          }}
          aria-label="Dismiss"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}
