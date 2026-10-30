import { describe, expect, it } from "vitest";
import { startPlayOut } from "./modes";
import { applyMatchDart, currentLeg, newMatch, type MatchState } from "./match";
import { canCancel, canEnter, canPlayOut, canUndo, isOpen, maySetStarter, MATCH_OPEN_MS, type MatchAccess } from "./permissions";
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

const throwAll = (s: MatchState, darts: Dart[]) =>
  darts.reduce((m, d) => {
    const r = applyMatchDart(m, d);
    if (!r.ok) throw new Error(r.reason);
    return r.value;
  }, s);

/** Match with three players, after `visits` complete visits. */
const legAfter = (visits: number) =>
  throwAll(
    newMatch(
      players.map((p) => p.id),
      rules,
      { legsToWinSet: 1, setsToWinMatch: 1 },
    ),
    Array.from({ length: visits * 3 }, () => S20),
  );

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

describe("legs and play-out (M5)", () => {
  const short = { startScore: 40, inRule: "single", outRule: "single" } as const;
  const D20: Dart = { field: 20, type: "double" };
  const MISS: Dart[] = [
    { field: 0, type: "single" },
    { field: 0, type: "single" },
    { field: 0, type: "single" },
  ];
  const m: MatchAccess = { ...base, inputMode: "per-player" };

  it("between two legs the starter of the next leg enters", () => {
    const two = newMatch(["host", "b"], short, { legsToWinSet: 2, setsToWinMatch: 1 });
    const s = throwAll(two, [D20]); // host wins leg 1, b starts leg 2
    expect(canEnter(s, m, b, now)).toBe(true);
    expect(canEnter(s, m, host, now)).toBe(false);
    expect(canUndo(s, m, host, now)).toBe(true); // host's winning dart
  });

  it("play-out and its undo belong to whoever enters for the last player", () => {
    const fixed = throwAll(newMatch(["host", "b", "guest"], short, { legsToWinSet: 1, setsToWinMatch: 1 }), [D20, D20]);
    const finished = { ...m, status: "finished" as const };
    expect(canPlayOut(fixed, finished, host, now)).toBe(true); // guest → host
    expect(canPlayOut(fixed, finished, b, now)).toBe(false);
    const r = startPlayOut(currentLeg(fixed));
    if (!r.ok) throw new Error(r.reason);
    const playing = { ...fixed, legs: [r.value] };
    expect(canUndo(playing, m, host, now)).toBe(true); // undo of the choice
    expect(canUndo(playing, m, b, now)).toBe(false);
    expect(canPlayOut(throwAll(playing, MISS), m, host, now)).toBe(true);
    expect(canPlayOut(legAfter(1), m, host, now)).toBe(false); // places not fixed
  });

  it("choosing the starter: host or admin", () => {
    expect(maySetStarter(base, host)).toBe(true);
    expect(maySetStarter(base, admin)).toBe(true);
    expect(maySetStarter(base, b)).toBe(false);
  });
});
