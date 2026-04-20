/**
 * Simple in-memory rate limiter for auth endpoints.
 * Resets automatically after the window expires.
 * For multi-instance deployments, replace with Redis-backed implementation.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Returns true if the request should be blocked (limit exceeded).
 *
 * @param key      - Unique key (e.g. IP address or "ip:endpoint")
 * @param limit    - Max requests allowed in the window
 * @param windowMs - Window duration in milliseconds
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  if (entry.count > limit) {
    return true;
  }

  return false;
}
