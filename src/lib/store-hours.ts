/**
 * Store Operating Hours Utility (Asia/Karachi — PKT UTC+5)
 * Daily Operating Hours: 7:00 PM (19:00) to 4:00 AM (04:00)
 */

export interface StoreStatusResult {
  isOpen: boolean;
  isWithinHours: boolean;
  adminAllowed: boolean;
  operatingHoursText: string;
  currentTimePkt: string;
  reason?: "closed_by_admin" | "closed_off_hours";
}

/**
 * Checks whether the given date/time falls within operating hours:
 * 7:00 PM (19:00) to 4:00 AM (04:00) Pakistan Standard Time (PKT).
 */
export function isWithinOperatingHours(date: Date = new Date()): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const hourPart = parts.find((p) => p.type === "hour")?.value;
    const hour = hourPart ? parseInt(hourPart, 10) : 0;

    // 7:00 PM to 11:59 PM: hours 19, 20, 21, 22, 23
    // 12:00 AM to 03:59 AM: hours 0, 1, 2, 3
    if (hour >= 19 || hour < 4) {
      return true;
    }

    return false;
  } catch (err) {
    console.warn("Error parsing Karachi timezone, fallback to local hour:", err);
    const localHour = date.getHours();
    return localHour >= 19 || localHour < 4;
  }
}

/**
 * Returns human-readable current time in Karachi (e.g., "07:30 PM")
 */
export function getKarachiCurrentTime(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  }
}

/**
 * Returns the overall store open/closed status combining:
 * 1. Admin manual override (`settings.is_active`)
 * 2. Operating hours (7:00 PM to 4:00 AM PKT)
 */
export function getStoreOpenStatus(
  adminIsActive: boolean = true,
  date: Date = new Date()
): StoreStatusResult {
  const isWithinHours = isWithinOperatingHours(date);
  const adminAllowed = adminIsActive !== false;
  const currentTimePkt = getKarachiCurrentTime(date);
  const operatingHoursText = "7:00 PM – 4:00 AM";

  if (!adminAllowed) {
    return {
      isOpen: false,
      isWithinHours,
      adminAllowed,
      operatingHoursText,
      currentTimePkt,
      reason: "closed_by_admin",
    };
  }

  if (!isWithinHours) {
    return {
      isOpen: false,
      isWithinHours,
      adminAllowed,
      operatingHoursText,
      currentTimePkt,
      reason: "closed_off_hours",
    };
  }

  return {
    isOpen: true,
    isWithinHours,
    adminAllowed,
    operatingHoursText,
    currentTimePkt,
  };
}
