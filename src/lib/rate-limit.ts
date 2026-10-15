/**
 * In-memory sliding-window rate limiter for sensitive API routes.
 * Tracks requests per IP address with automatic memory cleanup.
 */

type RateLimitRecord = {
  timestamps: number[];
};

const store = new Map<string, RateLimitRecord>();

// Periodically clean up stale entries every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 600_000);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 300_000);

  // Unref timer in Node environment so it doesn't prevent process exit
  if (cleanupTimer && typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = store.get(key);
  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return {
      success: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    remaining: limit - record.timestamps.length,
    retryAfterSeconds: 0,
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}
