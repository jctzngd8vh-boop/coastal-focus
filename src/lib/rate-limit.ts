import "server-only";

/**
 * Minimal in-memory fixed-window rate limiter for the public order-creation
 * endpoint. Good enough for a single small-business storefront on a single
 * server instance; if you deploy to multiple serverless regions/instances,
 * swap this for a shared store (e.g. Upstash Redis) — the call site
 * (src/app/api/orders/route.ts) is the only place that needs to change.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;

const hits = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true };
}

// Periodically forget stale entries so the map doesn't grow unbounded.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (now - entry.windowStart > WINDOW_MS * 5) hits.delete(key);
    }
  }, WINDOW_MS * 5).unref?.();
}
