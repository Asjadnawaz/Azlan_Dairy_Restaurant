"use client";

/**
 * The KPI tile contract: label · value · optional delta · optional trend.
 *
 * Tiles stay neutral on purpose. The icon chip carries the brand green and
 * nothing else is coloured except the delta, which is a direction cue rather
 * than a series — no rainbow tiles, and text never wears a data colour. Values
 * use the font's default proportional figures because a large standalone number
 * looks loose in tabular figures; only the delta, which sits in a row of them,
 * is tabular.
 */

import { Sparkline, VIZ } from "./charts";

export type StatDelta = {
  /** null when the baseline was zero — "+∞%" is noise, so no delta renders. */
  pct: number | null;
  /** Named comparison period, e.g. "vs yesterday". */
  vs: string;
  /** false for metrics where a rise is bad (cancellations). */
  upIsGood?: boolean;
};

export function StatTile({
  label,
  value,
  icon,
  delta,
  trend,
  hint,
  hero = false,
  onClick,
  active = false,
}: {
  label: string;
  value: string;
  icon: string;
  delta?: StatDelta;
  trend?: number[];
  hint?: string;
  /** The one number the view leads with. At most one per section. */
  hero?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  const showDelta = delta && delta.pct !== null && delta.pct !== 0;
  const up = (delta?.pct ?? 0) > 0;
  const upIsGood = delta?.upIsGood ?? true;
  const deltaColour = up === upIsGood ? VIZ.good : VIZ.bad;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="w-8 h-8 shrink-0 rounded-xl bg-[var(--color-primary)]/8 text-[var(--color-primary)] flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
        {trend && trend.length > 1 && <Sparkline values={trend} />}
      </div>

      <p className="mt-2.5 text-xs font-semibold text-[var(--color-on-surface-variant)]">
        {label}
      </p>
      <p
        className={`font-extrabold leading-none text-[var(--color-on-surface)] ${
          hero ? "text-4xl sm:text-5xl mt-1.5" : "text-2xl mt-1"
        }`}
      >
        {value}
      </p>

      <div className="mt-1.5 flex items-center gap-1.5 min-h-[16px]">
        {showDelta ? (
          <span
            className="inline-flex items-center gap-0.5 text-[11px] font-extrabold tabular-nums"
            style={{ color: deltaColour }}
          >
            <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
              {up ? "arrow_upward" : "arrow_downward"}
            </span>
            {up ? "+" : ""}
            {delta!.pct}%
            <span className="font-medium text-[var(--color-on-surface-variant)]">
              {delta!.vs}
            </span>
          </span>
        ) : (
          hint && (
            <span className="text-[11px] font-medium text-[var(--color-on-surface-variant)]">
              {hint}
            </span>
          )
        )}
      </div>
    </>
  );

  const shell = `rounded-2xl border p-3.5 text-left transition-colors ${
    active
      ? "border-[var(--color-primary)] bg-[var(--color-surface-container-low)]"
      : "border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]"
  }`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`${shell} hover:border-[var(--color-primary)]/40 cursor-pointer`}
      >
        {body}
      </button>
    );
  }

  return <div className={shell}>{body}</div>;
}

/** A responsive KPI row. Two-up on the smallest screens, never one-up. */
export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">{children}</div>
  );
}
