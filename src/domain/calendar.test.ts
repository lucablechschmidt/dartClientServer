import { describe, expect, it } from "vitest";
import { startOfWeek } from "./calendar";

const at = (iso: string) => new Date(iso).getTime();

describe("startOfWeek (Europe/Berlin)", () => {
  it("is Monday 00:00 local time, in winter (UTC+1) and summer (UTC+2)", () => {
    expect(startOfWeek(at("2026-11-11T15:00:00Z"))).toBe(at("2026-11-08T23:00:00Z")); // Wed → Mon 9.11. 00:00 CET
    expect(startOfWeek(at("2026-07-16T10:00:00Z"))).toBe(at("2026-07-12T22:00:00Z")); // Thu → Mon 13.7. 00:00 CEST
  });
  it("Monday just after midnight local time already belongs to the new week; Sunday late to the old one", () => {
    expect(startOfWeek(at("2026-11-08T23:30:00Z"))).toBe(at("2026-11-08T23:00:00Z")); // Mon 00:30 CET
    expect(startOfWeek(at("2026-11-08T22:30:00Z"))).toBe(at("2026-11-01T23:00:00Z")); // Sun 23:30 CET
  });
  it("around the switch to summer time: Monday 00:00 in the offset of that Monday", () => {
    // 29.3.2026 is the switch (Sunday); Tuesday 31.3. → Monday 30.3. 00:00 CEST = 29.3. 22:00 UTC
    expect(startOfWeek(at("2026-03-31T12:00:00Z"))).toBe(at("2026-03-29T22:00:00Z"));
    // Saturday 28.3. → Monday 23.3. 00:00 CET
    expect(startOfWeek(at("2026-03-28T12:00:00Z"))).toBe(at("2026-03-22T23:00:00Z"));
  });
});
