import { headers } from "next/headers";

/**
 * Rate limit for login and token redemption (M3): per IP at most `max` failed attempts in `windowMs`,
 * then a wait until the end of the window. In process memory; empty after a restart, which is enough here.
 */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; windowStart: number }>();
  constructor(
    private readonly windowMs: number,
    private readonly max: number,
    /** R-20 (m13-plan.md): from this many keys on, `fail` drops the expired ones first, so the map stays bounded. */
    private readonly sweepAt = 1000,
  ) {}

  /** Keys currently tracked (tests). */
  get size(): number {
    return this.hits.size;
  }

  /** Milliseconds the client still has to wait, or 0. */
  retryAfter(key: string, now: number): number {
    const h = this.hits.get(key);
    if (!h) return 0;
    if (now - h.windowStart >= this.windowMs) {
      this.hits.delete(key);
      return 0;
    }
    return h.count >= this.max ? h.windowStart + this.windowMs - now : 0;
  }

  fail(key: string, now: number): void {
    if (this.hits.size >= this.sweepAt) this.sweep(now);
    const h = this.hits.get(key);
    if (!h || now - h.windowStart >= this.windowMs) this.hits.set(key, { count: 1, windowStart: now });
    else h.count++;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  private sweep(now: number): void {
    for (const [key, h] of this.hits) if (now - h.windowStart >= this.windowMs) this.hits.delete(key);
  }
}

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_FAILURES = 10;

const globalForLimiter = globalThis as unknown as { __dartsLoginLimiter?: RateLimiter };
/** One limiter per process, shared by login and invite. */
export function loginLimiter(): RateLimiter {
  return (globalForLimiter.__dartsLoginLimiter ??= new RateLimiter(LOGIN_WINDOW_MS, LOGIN_MAX_FAILURES));
}

/** Client IP: first entry of X-Forwarded-For (set by Caddy), otherwise "local". */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
