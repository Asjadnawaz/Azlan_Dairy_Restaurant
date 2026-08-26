"use client";

/**
 * Hand-rolled SVG/CSS chart primitives for the admin dashboard. No chart
 * library — these four forms are all the dashboard needs and a dependency would
 * cost more bundle than the whole admin section.
 *
 * Colour is not eyeballed. Every value in VIZ was run through the data-viz
 * validator against the real #ffffff card surface:
 *   · `series` / `seriesAlt` as a 2-slot categorical pair — ALL PASS
 *     (CVD ΔE 23.4 deutan, normal-vision ΔE 24.7, both ≥ 3:1 vs surface)
 *   · `ordinal` as a 5-step single-hue ordinal ramp — ALL PASS
 *     (monotone lightness, ΔL gaps ≥ 0.06, light end 3.36:1, hue spread 3°)
 *   · every ink below clears WCAG AA on the surface it sits on
 * A six-hue status palette was tried first and FAILED (deutan ΔE 0.3), which is
 * why status uses emphasis — see status-chip styling in order-row.tsx.
 *
 * Mark specs follow the shared rules: bars capped at 24px with a 4px rounded
 * data-end and a square baseline end, hairline solid gridlines, a 2px surface
 * gap between touching marks, labels only on the extreme and the endpoint, and
 * text always in an ink token rather than the data colour.
 */

import { useEffect, useRef, useState } from "react";

export const VIZ = {
  /** Single-series / slot 1. */
  series: "#156d36",
  /** Slot 2, only ever used opposite `series`. */
  seriesAlt: "#2a78d6",
  /** Ordinal ramp, light → dark, for ordered stages. */
  ordinal: ["#4a9c68", "#2f8850", "#1f7040", "#155c33", "#0d4722"],
  grid: "#e3e8e2",
  track: "#eef2ec",
  ink: "var(--color-on-surface)",
  inkSecondary: "var(--color-on-surface-variant)",
  /** 4.77:1 on white — small axis text is still AA. */
  inkMuted: "#6d7569",
  good: "#006300",
  bad: "#d03b3b",
} as const;

/* -------------------------------------------------------------------------- */
/* Geometry helpers                                                           */
/* -------------------------------------------------------------------------- */

/** Column path: rounded at the data end, square where it meets the baseline. */
function columnPath(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + rr}`,
    `Q ${x} ${y} ${x + rr} ${y}`,
    `L ${x + w - rr} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + rr}`,
    `L ${x + w} ${y + h}`,
    "Z",
  ].join(" ");
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = 10 ** exp;
  const n = v / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * base;
}

/** Rough advance width for the 9–10px UI sans, used to decide if a label fits. */
function estWidth(text: string, fontPx = 10): number {
  return text.length * fontPx * 0.58;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver((entries) => {
      setWidth(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width] as const;
}

/* -------------------------------------------------------------------------- */
/* Shared chrome                                                              */
/* -------------------------------------------------------------------------- */

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4 sm:p-5 ${className}`}
    >
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-[var(--color-on-surface)] leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/**
 * The guaranteed non-visual path to every value in a chart. Collapsed by
 * default so it costs no space, but always present — nothing is gated behind
 * hover or colour.
 */
export function TableView({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="mt-3 group">
      <summary className="cursor-pointer text-[11px] font-bold text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] inline-flex items-center gap-1 list-none">
        <span className="material-symbols-outlined text-[14px] transition-transform group-open:rotate-90">
          chevron_right
        </span>
        Table view
      </summary>
      <div className="mt-2 max-h-56 overflow-auto slim-scrollbar rounded-xl border border-[var(--color-outline-variant)]">
        <table className="w-full text-xs">
          <thead className="bg-[var(--color-surface-container-low)] sticky top-0">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`px-3 py-2 font-bold text-[var(--color-on-surface-variant)] ${
                    i === 0 ? "text-left" : "text-right"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-t border-[var(--color-outline-variant)]">
                {r.map((c, ci) => (
                  <td
                    key={ci}
                    className={`px-3 py-1.5 ${
                      ci === 0
                        ? "text-left text-[var(--color-on-surface)] font-medium"
                        : "text-right text-[var(--color-on-surface)] tabular-nums"
                    }`}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function EmptyViz({ label }: { label: string }) {
  return (
    <div className="py-10 text-center">
      <span className="material-symbols-outlined text-[32px] text-[var(--color-on-surface-variant)]/40">
        bar_chart
      </span>
      <p className="mt-1 text-xs font-semibold text-[var(--color-on-surface-variant)]">{label}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Column chart                                                              */
/* -------------------------------------------------------------------------- */

export type ColumnDatum = { key: string; label: string; value: number; hint?: string };

/**
 * Single-series columns over time. No legend box: there is one colour and the
 * card title names what is plotted.
 */
export function ColumnChart({
  data,
  height = 176,
  formatValue,
  formatTick,
  valueName,
}: {
  data: ColumnDatum[];
  height?: number;
  formatValue: (n: number) => string;
  formatTick?: (n: number) => string;
  valueName: string;
}) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const tick = formatTick ?? formatValue;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const padL = Math.max(34, estWidth(tick(max), 10) + 10);
  const padR = 6;
  const padT = 18;
  const padB = 20;

  const pw = Math.max(0, width - padL - padR);
  const ph = Math.max(0, height - padT - padB);
  const band = data.length > 0 ? pw / data.length : 0;
  const barW = Math.max(3, Math.min(24, band - 6));

  // Only the extreme and the endpoint get a direct label.
  const maxIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const labelled = new Set<number>();
  if (data.length > 0 && data[maxIdx].value > 0) labelled.add(maxIdx);
  if (data.length > 0 && data[data.length - 1].value > 0) labelled.add(data.length - 1);

  // X ticks thin out until they stop colliding; the last one always shows.
  const xStep = Math.max(1, Math.ceil(estWidth(data[0]?.label ?? "", 10) / Math.max(band, 1)));

  const hovered = hover !== null ? data[hover] : null;

  return (
    <div>
      <div ref={wrapRef} className="relative w-full">
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${valueName} by day. Peak ${formatValue(data[maxIdx]?.value ?? 0)} on ${
              data[maxIdx]?.label ?? "—"
            }. Full values in the table view below.`}
            className="block overflow-visible"
          >
            {/* Gridlines — hairline, solid, recessive */}
            {[0, 0.5, 1].map((f) => {
              const y = padT + ph - ph * f;
              return (
                <g key={f}>
                  <line
                    x1={padL}
                    x2={padL + pw}
                    y1={y}
                    y2={y}
                    stroke={f === 0 ? "var(--color-outline-variant)" : VIZ.grid}
                    strokeWidth={1}
                  />
                  <text
                    x={padL - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize={10}
                    fill={VIZ.inkMuted}
                    className="tabular-nums"
                  >
                    {tick(max * f)}
                  </text>
                </g>
              );
            })}

            {data.map((d, i) => {
              const h = max > 0 ? (d.value / max) * ph : 0;
              const x = padL + band * i + (band - barW) / 2;
              const y = padT + ph - h;
              const isHover = hover === i;
              const labelText = formatValue(d.value);
              const fits = estWidth(labelText, 10) <= band * 2.2;

              return (
                <g key={d.key}>
                  {/* Hit target spans the whole band — bigger than the mark. */}
                  <rect
                    x={padL + band * i}
                    y={padT}
                    width={Math.max(band, 1)}
                    height={ph}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${d.label}: ${labelText}`}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    style={{ cursor: "default", outline: "none" }}
                  />
                  {h > 0 ? (
                    <path
                      d={columnPath(x, y, barW, h)}
                      fill={VIZ.series}
                      opacity={hover === null || isHover ? 1 : 0.55}
                      pointerEvents="none"
                    />
                  ) : (
                    // A zero day is a fact, not a gap: a 2px stub on the baseline.
                    <rect
                      x={x}
                      y={padT + ph - 2}
                      width={barW}
                      height={2}
                      fill={VIZ.grid}
                      pointerEvents="none"
                    />
                  )}
                  {labelled.has(i) && fits && (
                    <text
                      x={x + barW / 2}
                      y={y - 6}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={700}
                      fill={VIZ.ink}
                      pointerEvents="none"
                    >
                      {labelText}
                    </text>
                  )}
                  {(i % xStep === 0 || i === data.length - 1) && (
                    <text
                      x={padL + band * i + band / 2}
                      y={height - 6}
                      textAnchor="middle"
                      fontSize={10}
                      fill={VIZ.inkMuted}
                      pointerEvents="none"
                    >
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {hovered && band > 0 && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-[var(--color-on-surface)] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg whitespace-nowrap"
            style={{
              left: Math.min(
                Math.max(padL + band * (hover! + 0.5), 56),
                Math.max(width - 56, 56)
              ),
              top: 0,
            }}
          >
            {hovered.label} · {formatValue(hovered.value)}
            {hovered.hint && (
              <span className="font-medium text-white/75"> · {hovered.hint}</span>
            )}
          </div>
        )}
      </div>

      <TableView
        headers={["Day", valueName]}
        rows={data.map((d) => [d.label, formatValue(d.value)])}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bar list                                                                  */
/* -------------------------------------------------------------------------- */

export type BarRow = { key: string; label: string; value: number; hint?: string };

/**
 * Horizontal bars for ranked categories — the right form when names are long,
 * which product names always are.
 */
export function BarList({
  rows,
  formatValue,
  valueName,
  accent = VIZ.series,
  emptyLabel = "Nothing sold yet",
}: {
  rows: BarRow[];
  formatValue: (n: number) => string;
  valueName: string;
  accent?: string;
  emptyLabel?: string;
}) {
  if (rows.length === 0) return <EmptyViz label={emptyLabel} />;

  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div>
      <ol className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-xs font-bold text-[var(--color-on-surface)] truncate">
                {r.label}
              </span>
              <span className="text-xs font-extrabold text-[var(--color-on-surface)] tabular-nums shrink-0">
                {formatValue(r.value)}
                {r.hint && (
                  <span className="ml-1.5 font-medium text-[var(--color-on-surface-variant)]">
                    {r.hint}
                  </span>
                )}
              </span>
            </div>
            <div
              className="h-2.5 w-full rounded-sm"
              style={{ backgroundColor: VIZ.track }}
              role="presentation"
            >
              <div
                className="h-2.5"
                style={{
                  width: `${Math.max((r.value / max) * 100, r.value > 0 ? 1.5 : 0)}%`,
                  backgroundColor: accent,
                  // Rounded data end, square at the baseline it grows from.
                  borderRadius: "0 4px 4px 0",
                }}
              />
            </div>
          </li>
        ))}
      </ol>

      <TableView
        headers={["Item", valueName]}
        rows={rows.map((r) => [r.label, formatValue(r.value) + (r.hint ? ` (${r.hint})` : "")])}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Ordered-stage bars                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The order pipeline as it stands right now. Deliberately NOT called a funnel:
 * these are counts of orders currently sitting in each stage, not one cohort
 * draining through, so the widths must not imply drop-off. The stages are
 * ordered, so they take the ordinal ramp rather than categorical hues.
 */
export function StageBars({
  stages,
}: {
  stages: { label: string; count: number }[];
}) {
  const max = Math.max(...stages.map((s) => s.count), 1);
  const total = stages.reduce((sum, s) => sum + s.count, 0);

  if (total === 0) return <EmptyViz label="No orders in the pipeline" />;

  return (
    <div>
      <ol className="space-y-2.5">
        {stages.map((s, i) => (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-xs font-bold text-[var(--color-on-surface)]">{s.label}</span>
              <span className="text-xs font-extrabold text-[var(--color-on-surface)] tabular-nums">
                {s.count}
                <span className="ml-1.5 font-medium text-[var(--color-on-surface-variant)]">
                  {total > 0 ? `${Math.round((s.count / total) * 100)}%` : "0%"}
                </span>
              </span>
            </div>
            <div className="h-2.5 w-full rounded-sm" style={{ backgroundColor: VIZ.track }}>
              <div
                className="h-2.5"
                style={{
                  width: `${Math.max((s.count / max) * 100, s.count > 0 ? 1.5 : 0)}%`,
                  backgroundColor: VIZ.ordinal[Math.min(i, VIZ.ordinal.length - 1)],
                  borderRadius: "0 4px 4px 0",
                }}
              />
            </div>
          </li>
        ))}
      </ol>
      <TableView
        headers={["Stage", "Orders"]}
        rows={stages.map((s) => [s.label, s.count])}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Two-series split                                                          */
/* -------------------------------------------------------------------------- */

/**
 * A part-to-whole split of exactly two series. Two series means a legend is
 * always present — colour never carries identity alone. The inline label only
 * renders when the segment is wide enough to hold it without clipping.
 */
export function SplitBar({
  a,
  b,
  unit = "orders",
}: {
  a: { label: string; value: number };
  b: { label: string; value: number };
  unit?: string;
}) {
  const total = a.value + b.value;
  if (total === 0) return <EmptyViz label={`No ${unit} yet`} />;

  const aPct = (a.value / total) * 100;
  const bPct = 100 - aPct;
  const series: [typeof a, string, number][] = [
    [a, VIZ.series, aPct],
    [b, VIZ.seriesAlt, bPct],
  ];

  return (
    <div>
      {/* Legend — always, for two series */}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-2.5">
        {series.map(([s, colour, pct]) => (
          <li key={s.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: colour }}
              aria-hidden="true"
            />
            <span className="font-bold text-[var(--color-on-surface)]">{s.label}</span>
            <span className="tabular-nums text-[var(--color-on-surface-variant)]">
              {s.value} · {Math.round(pct)}%
            </span>
          </li>
        ))}
      </ul>

      <div className="flex h-7 w-full overflow-hidden rounded-md" role="img"
        aria-label={`${a.label} ${a.value} ${unit}, ${b.label} ${b.value} ${unit}`}>
        {series.map(([s, colour, pct], i) => (
          <div
            key={s.label}
            className="flex items-center justify-center transition-[width] duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: colour,
              // 2px of surface does the separating — never a stroke on the mark.
              marginLeft: i === 1 ? 2 : 0,
            }}
            title={`${s.label}: ${s.value} ${unit}`}
          >
            {pct >= 22 && (
              <span className="text-[11px] font-extrabold text-white tabular-nums">
                {Math.round(pct)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 14-point trend line for a stat tile. Line in the light end of the ordinal
 * ramp (3.36:1 on white), current point in the dark end — same hue, so it reads
 * as one series with an emphasised endpoint.
 */
export function Sparkline({
  values,
  width = 96,
  height = 28,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const stepX = width / (values.length - 1);
  const y = (v: number) => height - 3 - (v / max) * (height - 6);
  const points = values.map((v, i) => `${i * stepX},${y(v)}`).join(" ");
  const lastX = (values.length - 1) * stepX;

  return (
    <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={VIZ.ordinal[0]}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* 2px surface ring keeps the end dot legible where it crosses the line. */}
      <circle
        cx={lastX}
        cy={y(values[values.length - 1])}
        r={4}
        fill={VIZ.ordinal[4]}
        stroke="var(--color-surface-container-lowest)"
        strokeWidth={2}
      />
    </svg>
  );
}
