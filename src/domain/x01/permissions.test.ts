import { describe, expect, it } from "vitest";
import { applyDart } from "./apply";
import { canCancel, canEnter, canUndo, isOpen, MATCH_OPEN_MS, type MatchAccess } from "./permissions";
import { newLeg } from "./state";
import type { Dart } from "./types";

const rules = { startScore: 501, inRule: "single", outRule: "double" } as const;
const players = [
  { id: "host", hasLogin: true },
  { id: "b", hasLogin: true },
  { id: "guest", hasLogin: false },
];
const base: MatchAccess = { status: "running", startedAt: 1000, inputMode: "single", hostPlayerId: "host", players };
const host = { id: "host", isAdmin: false };
const b = { id: "b", isAdmin: false };
const admin = { id: "admin", isAdmin: true };
const now = 2000;
const S20: Dart = { field: 20, type: "single" };

/** Leg with three players, after `visits` complete visits. */
const legAfter = (visits: number) => {
  let s = newLeg(players.map((p) => p.id), rules, 0);
  for (let i = 0; i < visits * 3; i++) {
    const r = applyDart(s, S20);
    if (!r.ok) throw new Error(r.reason);
    s = r.value;
  }
  return s;
};

describe("isOpen", () => {
  it("running and younger than 24 h", () => {
    expect(isOpen(base, now)).toBe(true);
    expect(isOpen(base, 1000 + MATCH_OPEN_MS - 1)).toBe(true);
    expect(isOpen(base, 1000 + MATCH_OPEN_MS)).toBe(false);
    expect(isOpen({ ...base, status: "abandoned" }, now)).toBe(false);
    expect(isOpen({ ...base, status: "finished" }, now)).toBe(false);
  });
});

describe("single mode", () => {
  it("only the host enters and undoes, whoever is on turn", () => {
    const s = legAfter(1); // b on turn
    expect(canEnter(s, base, host, now)).toBe(true);
    expect(canEnter(s, base, b, now)).toBe(false);
    expect(canEnter(s, base, admin, now)).toBe(false);
    expect(canUndo(s, base, host, now)).toBe(true);
    expect(canUndo(s, base, b, now)).toBe(false);
  });
  it("without a host (legacy matches) only an admin may", () => {
    const m = { ...base, hostPlayerId: null };
    expect(canEnter(legAfter(0), m, host, now)).toBe(false);
    expect(canEnter(legAfter(0), m, admin, now)).toBe(true);
  });
});

describe("per-player mode", () => {
  const m: MatchAccess = { ...base, inputMode: "per-player" };
  it("the player on turn enters on their own device, not the host", () => {
    const s = legAfter(1); // b on turn
    expect(canEnter(s, m, b, now)).toBe(true);
    expect(canEnter(s, m, host, now)).toBe(false);
    expect(canEnter(s, m, admin, now)).toBe(false);
  });
  it("a guest on turn is entered by the host only", () => {
    const s = legAfter(2); // guest on turn
    expect(canEnter(s, m, host, now)).toBe(true);
    expect(canEnter(s, m, b, now)).toBe(false);
  });
  it("undo belongs to whoever could have entered the last saved visit", () => {
    const s = legAfter(1); // last visit by host, b on turn
    expect(canUndo(s, m, host, now)).toBe(true);
    expect(canUndo(s, m, b, now)).toBe(false);
    const s2 = legAfter(3); // last visit by the guest → host
    expect(canUndo(s2, m, host, now)).toBe(true);
    expect(canUndo(s2, m, b, now)).toBe(false);
    expect(canUndo(legAfter(0), m, host, now)).toBe(false);
  });
});

describe("closed matches and cancel", () => {
  it("nothing may be entered or undone once closed, not even by the host; a fresh finished match still allows undo", () => {
    const s = legAfter(1);
    expect(canEnter(s, base, host, 1000 + MATCH_OPEN_MS)).toBe(false);
    expect(canUndo(s, base, host, 1000 + MATCH_OPEN_MS)).toBe(false);
    expect(canUndo(s, { ...base, status: "abandoned" }, host, now)).toBe(false);
    expect(canUndo(s, { ...base, status: "finished" }, host, now)).toBe(true);
    expect(canEnter(s, { ...base, status: "finished" }, host, now)).toBe(false);
  });
  it("cancel: host or admin while open", () => {
    expect(canCancel(base, host, now)).toBe(true);
    expect(canCancel(base, admin, now)).toBe(true);
    expect(canCancel(base, b, now)).toBe(false);
    expect(canCancel({ ...base, status: "abandoned" }, host, now)).toBe(false);
    expect(canCancel(base, host, 1000 + MATCH_OPEN_MS)).toBe(false);
  });
});
