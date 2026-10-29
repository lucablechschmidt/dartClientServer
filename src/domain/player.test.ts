import { describe, expect, it } from "vitest";
import { GUEST_LIFETIME_MS, isGuest, isListed } from "./player";

const H = 60 * 60 * 1000;

describe("player guests (E12)", () => {
  it("a regular player is always listed and no guest", () => {
    expect(isListed({ guestUntil: null }, 0)).toBe(true);
    expect(isListed({ guestUntil: null }, Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(isGuest({ guestUntil: null })).toBe(false);
  });
  it("a guest is listed until guestUntil and gone right after", () => {
    const guest = { guestUntil: 1000 + H };
    expect(isGuest(guest)).toBe(true);
    expect(isListed(guest, 1000)).toBe(true);
    expect(isListed(guest, 1000 + H - 1)).toBe(true);
    expect(isListed(guest, 1000 + H)).toBe(false);
    expect(isListed(guest, 1000 + H + 1)).toBe(false);
  });
  it("guests live 24 hours", () => {
    expect(GUEST_LIFETIME_MS).toBe(24 * H);
  });
});
