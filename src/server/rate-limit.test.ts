import { describe, expect, it } from "vitest";
import { ipFromHeaders, RateLimiter } from "./rate-limit";

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
  it("drops expired keys once the map reaches its sweep size, keeps the live ones (R-20)", () => {
    const l = new RateLimiter(MIN, 3, 3);
    l.fail("a", 0);
    l.fail("b", 0);
    l.fail("c", 30_000);
    expect(l.size).toBe(3);
    l.fail("d", MIN); // a and b have expired, c has not
    expect(l.size).toBe(2);
    l.fail("c", MIN);
    l.fail("c", MIN);
    expect(l.retryAfter("c", MIN)).toBeGreaterThan(0);
  });
  it("reset clears the counter", () => {
    const l = new RateLimiter(MIN, 1);
    l.fail("ip", 0);
    expect(l.retryAfter("ip", 1)).toBeGreaterThan(0);
    l.reset("ip");
    expect(l.retryAfter("ip", 1)).toBe(0);
  });
});

describe("ipFromHeaders (E18)", () => {
  it("the last X-Forwarded-For entry, the one Funnel sets", () => {
    expect(ipFromHeaders(new Headers({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
    // A client that sends its own header cannot choose the key: Funnel's entry comes last.
    expect(ipFromHeaders(new Headers({ "x-forwarded-for": "1.2.3.4, 2001:db8::1" }))).toBe("2001:db8::1");
  });
  it("without the header (local development) one shared key", () => {
    expect(ipFromHeaders(new Headers())).toBe("local");
    expect(ipFromHeaders(new Headers({ "x-forwarded-for": " " }))).toBe("local");
  });
});
