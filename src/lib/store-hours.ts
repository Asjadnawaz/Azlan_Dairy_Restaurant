/**
 * Store opening logic — Asia/Karachi (PKT, UTC+5, no DST).
 *
 * The schedule is the *default*, not a veto. Three modes live in
 * `settings.open_mode`:
 *
 *   auto         — follow `open_hour`..`close_hour` (7 PM – 4 AM by default)
 *   force_open   — open right now regardless of the clock
 *   force_closed — closed right now regardless of the clock
 *
 * A `force_open` carries an expiry in `settings.force_open_until`. The admin
 * shell refreshes it while someone is watching the dashboard and stamps it on
 * sign-out, so an admin who force-opens outside hours and then walks away does
 * not leave the shop open all night: 30 minutes later the next read of the
 * status sees the lapse, reports the schedule's answer instead, and asks the
 * caller to write `open_mode` back to `auto`.
 *
 * That evaluation is deliberately lazy rather than a cron job — by the time it
 * matters the admin's browser is gone, so it has to happen on whichever request
 * next asks whether the shop is open. `forceOpenLapsed` in the result is that
 * request's signal to persist the reset (see /api/store-status).
 *
 * Note the carve-out the shop asked for: if the lapse happens *inside* opening
 * hours, nothing closes — the flag is simply retired, because the schedule
 * already has the shop open.
 */

export type StoreOpenMode = "auto" | "force_open" | "force_closed";

/** Just the settings columns this module reads. */
export type StoreScheduleSettings = {
  is_active?: boolean | null;
  open_mode?: string | null;
  force_open_until?: string | null;
  open_hour?: number | null;
  close_hour?: number | null;
};

export const DEFAULT_OPEN_HOUR = 19;
export const DEFAULT_CLOSE_HOUR = 4;

/** How long a force-open survives without a heartbeat. */
export const FORCE_OPEN_GRACE_MS = 30 * 60 * 1000;

/** Temporary maintenance shutdown configuration (15 days). */
export const TEMPORARY_MAINTENANCE = {
  active: true,
  // 15 days from Sep 27, 2026 until Oct 12, 2026 19:00 PKT
  until: "2026-10-12T19:00:00+05:00",
  title: "Maintenance Shutdown",
  message: "We are temporarily closed for a 15-day maintenance shutdown. Online orders will resume on October 12.",
};

export interface StoreStatusResult {
  isOpen: boolean;
  /** Would the schedule alone have the shop open right now? */
  isWithinHours: boolean;
  mode: StoreOpenMode;
  /** A force-open is in effect and has not lapsed. */
  forceOpenActive: boolean;
  /** ms of grace left on a live force-open; null when there is none. */
  forceOpenExpiresInMs: number | null;
  /**
   * `open_mode` is `force_open` but the grace has run out. The caller should
   * write `open_mode = 'auto'` back to the database.
   */
  forceOpenLapsed: boolean;
  openHour: number;
  closeHour: number;
  operatingHoursText: string;
  currentTimePkt: string;
  /** Minutes until the schedule next opens; 0 when already within hours. */
  minutesUntilOpen: number;
  reason?: "closed_by_admin" | "closed_off_hours" | "temporary_closure";
  temporaryClosureMessage?: string;
}

/* -------------------------------------------------------------------------- */
/* Karachi clock                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Hour and minute in Karachi. Intl is the source of truth; the catch is for
 * runtimes shipped without full ICU data, where a fixed +5 offset is exactly
 * right anyway (PKT has no DST).
 */
function karachiClock(date: Date): { hour: number; minute: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(date);

    const hourRaw = parts.find((p) => p.type === "hour")?.value;
    const minuteRaw = parts.find((p) => p.type === "minute")?.value;
    // hour12:false still yields "24" for midnight in some ICU versions.
    const hour = hourRaw ? parseInt(hourRaw, 10) % 24 : 0;
    return { hour, minute: minuteRaw ? parseInt(minuteRaw, 10) : 0 };
  } catch {
    const shifted = new Date(date.getTime() + 5 * 60 * 60 * 1000);
    return { hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes() };
  }
}

/** Human-readable current time in Karachi, e.g. "7:30 PM". */
export function getKarachiCurrentTime(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    const { hour, minute } = karachiClock(date);
    return `${formatHour12(hour, minute)}`;
  }
}

function formatHour12(hour: number, minute = 0): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** "7:00 PM – 4:00 AM" — derived, never hardcoded, so it cannot drift. */
export function formatHoursText(
  openHour: number = DEFAULT_OPEN_HOUR,
  closeHour: number = DEFAULT_CLOSE_HOUR
): string {
  return `${formatHour12(openHour)} – ${formatHour12(closeHour)}`;
}

/* -------------------------------------------------------------------------- */
/* Schedule                                                                   */
/* -------------------------------------------------------------------------- */

function clampHour(value: number | null | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.trunc(value);
  return rounded >= 0 && rounded <= 23 ? rounded : fallback;
}

/**
 * Is `date` inside the opening window? The window wraps past midnight whenever
 * `closeHour <= openHour`, which is the normal case here (19:00 → 04:00).
 */
export function isWithinOperatingHours(
  date: Date = new Date(),
  openHour: number = DEFAULT_OPEN_HOUR,
  closeHour: number = DEFAULT_CLOSE_HOUR
): boolean {
  const { hour } = karachiClock(date);
  if (openHour === closeHour) return true; // degenerate = always open
  return closeHour < openHour
    ? hour >= openHour || hour < closeHour // wraps midnight
    : hour >= openHour && hour < closeHour;
}

/** Minutes until the schedule next opens; 0 when it is already open. */
export function minutesUntilOpen(
  date: Date = new Date(),
  openHour: number = DEFAULT_OPEN_HOUR,
  closeHour: number = DEFAULT_CLOSE_HOUR
): number {
  if (isWithinOperatingHours(date, openHour, closeHour)) return 0;
  const { hour, minute } = karachiClock(date);
  const nowMin = hour * 60 + minute;
  const openMin = openHour * 60;
  return nowMin <= openMin ? openMin - nowMin : 24 * 60 - nowMin + openMin;
}

/** "2h 15m" / "45m" — for the closed banner's countdown. */
export function formatCountdown(totalMinutes: number): string {
  if (totalMinutes <= 0) return "any moment";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* -------------------------------------------------------------------------- */
/* The status                                                                 */
/* -------------------------------------------------------------------------- */

function readMode(settings: StoreScheduleSettings | null): StoreOpenMode {
  const raw = settings?.open_mode;
  if (raw === "force_open" || raw === "force_closed" || raw === "auto") return raw;
  // Before the migration runs there is no open_mode column — the old boolean
  // could only ever close the shop, so that is what it maps to.
  return settings?.is_active === false ? "force_closed" : "auto";
}

export function getStoreOpenStatus(
  settings: StoreScheduleSettings | null,
  date: Date = new Date()
): StoreStatusResult {
  const openHour = clampHour(settings?.open_hour, DEFAULT_OPEN_HOUR);
  const closeHour = clampHour(settings?.close_hour, DEFAULT_CLOSE_HOUR);
  const isWithinHours = isWithinOperatingHours(date, openHour, closeHour);
  const mode = readMode(settings);

  const base = {
    isWithinHours,
    mode,
    openHour,
    closeHour,
    operatingHoursText: formatHoursText(openHour, closeHour),
    currentTimePkt: getKarachiCurrentTime(date),
    minutesUntilOpen: minutesUntilOpen(date, openHour, closeHour),
  };

  const isMaintenanceActive =
    TEMPORARY_MAINTENANCE.active &&
    date.getTime() < new Date(TEMPORARY_MAINTENANCE.until).getTime();

  if (isMaintenanceActive) {
    return {
      ...base,
      isOpen: false,
      forceOpenActive: false,
      forceOpenExpiresInMs: null,
      forceOpenLapsed: false,
      reason: "temporary_closure",
      temporaryClosureMessage: TEMPORARY_MAINTENANCE.message,
    };
  }

  // Does a force-open still have grace left? A null expiry means the admin
  // opened the shop but no heartbeat has landed yet — honour it rather than
  // slamming the door on them.
  let forceOpenActive = false;
  let forceOpenExpiresInMs: number | null = null;
  if (mode === "force_open") {
    const until = settings?.force_open_until
      ? Date.parse(settings.force_open_until)
      : NaN;
    if (Number.isNaN(until)) {
      forceOpenActive = true;
    } else {
      forceOpenExpiresInMs = until - date.getTime();
      forceOpenActive = forceOpenExpiresInMs > 0;
    }
  }
  const forceOpenLapsed = mode === "force_open" && !forceOpenActive;
  if (!forceOpenActive) forceOpenExpiresInMs = null;

  if (mode === "force_closed") {
    return {
      ...base,
      isOpen: false,
      forceOpenActive: false,
      forceOpenExpiresInMs: null,
      forceOpenLapsed: false,
      reason: "closed_by_admin",
    };
  }

  if (forceOpenActive) {
    return {
      ...base,
      isOpen: true,
      forceOpenActive: true,
      forceOpenExpiresInMs,
      forceOpenLapsed: false,
    };
  }

  // auto, or a force-open that has run out: the schedule decides. Inside hours
  // a lapsed flag changes nothing — it is just retired.
  return {
    ...base,
    isOpen: isWithinHours,
    forceOpenActive: false,
    forceOpenExpiresInMs: null,
    forceOpenLapsed,
    ...(isWithinHours ? {} : { reason: "closed_off_hours" as const }),
  };
}

/**
 * The wire shape shared by /api/store-status, the `useStoreStatus` hook and the
 * server components that seed it. Narrower than `StoreStatusResult` on purpose:
 * `forceOpenLapsed` is a server-side instruction, not something the browser
 * needs to know about.
 */
export type StoreStatusPayload = {
  isOpen: boolean;
  isWithinHours: boolean;
  mode: StoreOpenMode;
  operatingHoursText: string;
  currentTimePkt: string;
  minutesUntilOpen: number;
  forceOpenExpiresInMs: number | null;
  reason?: "closed_by_admin" | "closed_off_hours" | "temporary_closure";
  temporaryClosureMessage?: string;
};

export function toStoreStatusPayload(status: StoreStatusResult): StoreStatusPayload {
  return {
    isOpen: status.isOpen,
    isWithinHours: status.isWithinHours,
    mode: status.mode,
    operatingHoursText: status.operatingHoursText,
    currentTimePkt: status.currentTimePkt,
    minutesUntilOpen: status.minutesUntilOpen,
    forceOpenExpiresInMs: status.forceOpenExpiresInMs,
    reason: status.reason,
    temporaryClosureMessage: status.temporaryClosureMessage,
  };
}
