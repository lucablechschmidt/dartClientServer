import { beforeEach, describe, expect, it } from "vitest";
import { GUEST_LIFETIME_MS } from "@/domain/player";
import type { Dart } from "@/domain/game";
import { memoryDeps } from "./testing";
import { cleanupGuests } from "./guest-cleanup";
import { commitVisit, createMatch, loadMatchView } from "./match-service";
import { createGuest, createPlayer, listPlayers } from "./player-service";

let clock: number;
const ok = <T extends { ok: boolean }>(r: T) => { if (!r.ok) throw new Error("expected ok"); return r as Extract<T, { ok: true }>; };
const sessionAdmin = { playerId: "admin-session", name: "Admin", isAdmin: true };
let deps: ReturnType<typeof memoryDeps>;
let n: number;

beforeEach(() => {
  n = 0;
  clock = 1_000_000;
  deps = memoryDeps({ newId: () => `id${++n}`, now: () => clock });
});

const T = (field: number): Dart => ({ field, type: "triple" });
const S = (field: number): Dart => ({ field, type: "single" });
const rules = { startScore: 501, inRule: "single", outRule: "double" } as const;

describe("cleanupGuests (E12)", () => {
  it("keeps regular players' field hits, deletes the guest match and the guest, leaves regular matches alone", () => {
    const casey = ok(createPlayer(deps, "Casey")).player;
    const sam = ok(createPlayer(deps, "Sam")).player;
    const guest = ok(createGuest(deps, "Gast")).player;
    expect(listPlayers(deps).map((p) => p.name)).toEqual(["Casey", "Sam", "Gast"]);

    const guestMatch = createMatch(deps, { playerIds: [casey.id, guest.id], rules, starterIndex: 0 });
    // Casey: T20 S20 T5, Gast: 1 1 1, Casey: S20 S20 T20
    expect(commitVisit(deps, sessionAdmin, guestMatch, 0, 0, [T(20), S(20), T(5)]).ok).toBe(true);
    expect(commitVisit(deps, sessionAdmin, guestMatch, 0, 1, [S(1), S(1), S(1)]).ok).toBe(true);
    expect(commitVisit(deps, sessionAdmin, guestMatch, 0, 2, [S(20), S(20), T(20)]).ok).toBe(true);
    const regularMatch = createMatch(deps, { playerIds: [casey.id, sam.id], rules, starterIndex: 0 });

    // nothing happens before expiry
    clock += GUEST_LIFETIME_MS - 1;
    expect(cleanupGuests(deps)).toBe(0);
    expect(loadMatchView(deps, guestMatch)).not.toBeNull();

    clock += 1;
    expect(cleanupGuests(deps)).toBe(1);
    expect(loadMatchView(deps, guestMatch)).toBeNull();
    expect(loadMatchView(deps, regularMatch)).not.toBeNull();
    expect(listPlayers(deps).map((p) => p.name)).toEqual(["Casey", "Sam"]);
    expect(deps.store.players.has(guest.id)).toBe(false);
    // Casey: T20 S20 T5 → 4×20, 3×5; second visit S20 S20 T20 → +5×20
    expect(deps.players.fieldHitsOf(casey.id)).toEqual(new Map([[20, 9], [5, 3]]));
    expect(deps.players.fieldHitsOf(sam.id)).toEqual(new Map());
  });

  it("a busted visit of the regular player counts nothing", () => {
    const casey = ok(createPlayer(deps, "Casey")).player;
    const guest = ok(createGuest(deps, "Gast")).player;
    const id = createMatch(deps, { playerIds: [casey.id, guest.id], rules: { startScore: 301, inRule: "single", outRule: "double" }, starterIndex: 0 });
    expect(commitVisit(deps, sessionAdmin, id, 0, 0, [T(20), T(20), T(20)]).ok).toBe(true); // 121
    expect(commitVisit(deps, sessionAdmin, id, 0, 1, [S(0), S(0), S(0)]).ok).toBe(true);
    expect(commitVisit(deps, sessionAdmin, id, 0, 2, [T(20), T(20)]).ok).toBe(true); // 61 → 1 = Bust
    clock += GUEST_LIFETIME_MS;
    cleanupGuests(deps);
    expect(deps.players.fieldHitsOf(casey.id)).toEqual(new Map([[20, 9]]));
  });

  it("a match with two guests lives until the later guest expires", () => {
    const casey = ok(createPlayer(deps, "Casey")).player;
    const early = ok(createGuest(deps, "Early")).player;
    clock += 3600_000;
    const late = ok(createGuest(deps, "Late")).player;
    const id = createMatch(deps, { playerIds: [casey.id, early.id, late.id], rules, starterIndex: 0 });
    clock = early.guestUntil!;
    expect(cleanupGuests(deps)).toBe(0);
    expect(listPlayers(deps).map((p) => p.name)).toEqual(["Casey", "Late"]);
    expect(deps.store.players.has(early.id)).toBe(true); // still in a match, stays
    clock = late.guestUntil!;
    expect(cleanupGuests(deps)).toBe(1);
    expect(loadMatchView(deps, id)).toBeNull();
    expect(deps.store.players.size).toBe(1);
  });
});
