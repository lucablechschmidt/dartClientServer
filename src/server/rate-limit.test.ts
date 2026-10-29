import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rate-limit";

const MIN = 60_000;

describe("RateLimiter", () => {
  it("blocks after max failures within the window and frees after it", () => {
    const l = new RateLimiter(15 * MIN, 3);
    expect(l.retryAfter("ip", 0)).toBe(0);
    l.fail("ip", 0);
    l.fail("ip", MIN);
    expect(l.retryAfter("ip", 2 * MIN)).toBe(0);
    l.fail("ip", 2 * MIN);
    expect(l.retryAfter("ip", 3 * MIN)).toBe(12 * MIN);
    expect(l.retryAfter("other", 3 * MIN)).toBe(0);
    expect(l.retryAfter("ip", 15 * MIN)).toBe(0);
    l.fail("ip", 16 * MIN);
    expect(l.retryAfter("ip", 16 * MIN)).toBe(0); // new window, only one failed attempt so far
  });
  it("reset clears the counter", () => {
    const l = new RateLimiter(MIN, 1);
    l.fail("ip", 0);
    expect(l.retryAfter("ip", 1)).toBeGreaterThan(0);
    l.reset("ip");
    expect(l.retryAfter("ip", 1)).toBe(0);
  });
});
