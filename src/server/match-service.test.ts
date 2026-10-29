import { beforeEach, describe, expect, it } from "vitest";
import type { Dart } from "@/domain/x01";
import type { Deps } from "./deps";
import { memoryDeps } from "./testing";
import { cancelMatch, commitVisit, createMatch, listOpenMatches, loadMatchView, restartMatch, undoVisit } from "./match-service";
import { createGuest, createPlayer } from "./player-service";

const ok = <T extends { ok: boolean }>(r: T) => { if (!r.ok) throw new Error("expected ok"); return r as Extract<T, { ok: true }>; };
const sessionAdmin = { playerId: "admin-session", name: "Admin", isAdmin: true };
let deps: Deps;
let n: number;

beforeEach(() => {
  n = 0;
  deps = memoryDeps({ newId: () => `id${++n}`, now: () => 1000 + n });
});

const setup = (startScore: 301 | 401 | 501 = 501) => {
  const a = ok(createPlayer(deps, "Casey")).player;
  const b = ok(createPlayer(deps, "Sam")).player;
  const id = createMatch(deps, { playerIds: [a.id, b.id], rules: { startScore, inRule: "single", outRule: "double" }, starterIndex: 0 });
  return { a, b, id };
};

describe("match service", () => {
  it("creates a match and loads a scoreboard view", () => {
    const { id } = setup();
    const v = loadMatchView(deps, id)!;
    expect(v.board.players.map((p) => p.name)).toEqual(["Casey", "Sam"]);
    expect(v.board.players[0].rest).toBe(501);
    expect(v.status).toBe("running");
    expect(loadMatchView(deps, "nope")).toBeNull();
  });

  const T20 = { field: 20, type: "triple" } as const;
  const S = (field: number): Dart => ({ field, type: "single" });
  const miss3 = [S(0), S(0), S(0)];

  it("stores a complete visit, switches players and rejects a wrong sequence", () => {
    const { id, b } = setup();
    let r = commitVisit(deps, sessionAdmin, id, 0, [T20, T20, T20]);
    if (!r.ok) throw new Error(r.reason);
    expect(r.view.board.players[0].rest).toBe(321);
    expect(r.view.board.activePlayerId).toBe(b.id);
    expect(loadMatchView(deps, id)!.board).toEqual(r.view.board);
    // same or later position → the client is stale
    expect(commitVisit(deps, sessionAdmin, id, 0, [T20, T20, T20])).toEqual({ ok: false, reason: "out-of-sync" });
    expect(commitVisit(deps, sessionAdmin, id, 2, [T20, T20, T20])).toEqual({ ok: false, reason: "out-of-sync" });
    // incomplete visit without bust or checkout
    expect(commitVisit(deps, sessionAdmin, id, 1, [T20, T20])).toEqual({ ok: false, reason: "out-of-sync" });
    r = commitVisit(deps, sessionAdmin, id, 1, [T20, T20, T20]);
    expect(r.ok).toBe(true);
  });

  it("replays a bust from the thrown darts and stores overthrown slots", () => {
    const { id } = setup(301);
    commitVisit(deps, sessionAdmin, id, 0, [T20, T20, T20]); // 121
    commitVisit(deps, sessionAdmin, id, 1, miss3);
    // Casey: T20 (61), T20 → 1 left under double-out = bust; the second T20 is not stored
    const r = commitVisit(deps, sessionAdmin, id, 2, [T20, T20]);
    if (!r.ok) throw new Error(r.reason);
    expect(r.view.board.players[0].rest).toBe(121);
    expect(r.view.board.players[0].isBust).toBe(true);
    const stored = loadMatchView(deps, id)!.state.visits[2];
    expect(stored.isBust).toBe(true);
    expect(stored.darts.map((d) => d.type)).toEqual(["triple", "overthrown", "overthrown"]);
    // a third dart after the bust no longer belongs to this visit
    expect(undoVisit(deps, sessionAdmin, id).ok).toBe(true);
    expect(commitVisit(deps, sessionAdmin, id, 2, [T20, T20, S(1)])).toEqual({ ok: false, reason: "out-of-sync" });
  });

  it("rejects unknown matches and invalid darts", () => {
    const { id } = setup(301);
    expect(commitVisit(deps, sessionAdmin, "nope", 0, [T20])).toEqual({ ok: false, reason: "not-found" });
    expect(commitVisit(deps, sessionAdmin, id, 0, [{ field: 25, type: "triple" }])).toEqual({ ok: false, reason: "invalid-dart" });
    expect(commitVisit(deps, sessionAdmin, id, 0, [])).toEqual({ ok: false, reason: "invalid-dart" });
  });

  it("finishes the match on a checkout visit and reopens it on undo", () => {
    const { id, a } = setup(301);
    commitVisit(deps, sessionAdmin, id, 0, [T20, T20, T20]); // 121
    commitVisit(deps, sessionAdmin, id, 1, miss3);
    const last = commitVisit(deps, sessionAdmin, id, 2, [T20, { field: 11, type: "triple" }, { field: 14, type: "double" }]);
    if (!last.ok) throw new Error(last.reason);
    expect(last.view.board.winnerId).toBe(a.id);
    expect(last.view.status).toBe("finished");
    expect(loadMatchView(deps, id)!.status).toBe("finished");
    expect(commitVisit(deps, sessionAdmin, id, 3, [T20, T20, T20])).toEqual({ ok: false, reason: "leg-finished" });

    const u = undoVisit(deps, sessionAdmin, id);
    if (!u.ok) throw new Error(u.reason);
    expect(u.view.board.winnerId).toBeNull();
    expect(u.view.status).toBe("running");
    expect(u.view.board.players[0].rest).toBe(121);
    expect(u.view.board.activePlayerId).toBe(a.id);
    expect(loadMatchView(deps, id)!.status).toBe("running");
  });

  it("undo removes the last stored visit and fails on an empty leg", () => {
    const { id, b } = setup();
    expect(undoVisit(deps, sessionAdmin, id)).toEqual({ ok: false, reason: "nothing-to-undo" });
    commitVisit(deps, sessionAdmin, id, 0, [S(20), S(20), S(20)]);
    commitVisit(deps, sessionAdmin, id, 1, [S(5), S(5), S(5)]);
    const u = undoVisit(deps, sessionAdmin, id);
    if (!u.ok) throw new Error(u.reason);
    expect(u.view.board.activePlayerId).toBe(b.id);
    expect(u.view.board.players[1].rest).toBe(501);
    expect(u.view.board.players[0].rest).toBe(441);
    expect(loadMatchView(deps, id)!.board).toEqual(u.view.board);
  });

  it("restart keeps players and rules and rotates the starter", () => {
    const { id, b } = setup(401);
    const next = restartMatch(deps, id)!;
    const v = loadMatchView(deps, next)!;
    expect(v.rules.startScore).toBe(401);
    expect(v.board.activePlayerId).toBe(b.id);
    expect(restartMatch(deps, "nope")).toBeNull();
  });
});

describe("input rights (E13)", () => {
  const as = (playerId: string) => ({ playerId, name: playerId, isAdmin: false });
  const T20: Dart = { field: 20, type: "triple" };
  it("single: only the host's device enters; closed matches reject everything", () => {
    const a = ok(createPlayer(deps, "Casey")).player;
    const b = ok(createPlayer(deps, "Sam")).player;
    const id = createMatch(deps, { playerIds: [a.id, b.id], rules: { startScore: 501, inRule: "single", outRule: "double" }, starterIndex: 0, hostPlayerId: a.id });
    expect(commitVisit(deps, as(b.id), id, 0, [T20, T20, T20])).toEqual({ ok: false, reason: "forbidden" });
    const r = commitVisit(deps, as(a.id), id, 0, [T20, T20, T20]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.view.access).toEqual({ isOpen: true, canEnter: true, canUndo: true, canCancel: true });
    expect(loadMatchView(deps, id, as(b.id))!.access).toEqual({ isOpen: true, canEnter: false, canUndo: false, canCancel: false });
    expect(undoVisit(deps, as(b.id), id)).toEqual({ ok: false, reason: "forbidden" });
    expect(cancelMatch(deps, as(b.id), id)).toEqual({ ok: false, reason: "forbidden" });
    expect(cancelMatch(deps, as(a.id), id)).toEqual({ ok: true });
    expect(commitVisit(deps, as(a.id), id, 1, [T20])).toEqual({ ok: false, reason: "match-closed" });
    expect(undoVisit(deps, as(a.id), id)).toEqual({ ok: false, reason: "match-closed" });
    expect(loadMatchView(deps, id, as(a.id))!.access.isOpen).toBe(false);
  });
  it("per-player: the player on turn enters on their device, the guest via the host; undo follows the last visit", () => {
    const a = ok(createPlayer(deps, "Casey")).player;
    const b = ok(createPlayer(deps, "Sam")).player;
    const g = ok(createGuest(deps, "Gast")).player;
    deps.players.setPasswordHash(a.id, "h");
    deps.players.setPasswordHash(b.id, "h"); // regular players have a login since M3
    const id = createMatch(deps, { playerIds: [a.id, b.id, g.id], rules: { startScore: 501, inRule: "single", outRule: "double" }, starterIndex: 0, inputMode: "per-player", hostPlayerId: a.id });
    expect(commitVisit(deps, as(b.id), id, 0, [T20]).ok).toBe(false);
    expect(commitVisit(deps, as(a.id), id, 0, [T20, T20, T20]).ok).toBe(true);
    expect(commitVisit(deps, as(a.id), id, 1, [T20]).ok).toBe(false); // b's turn, not the host
    expect(commitVisit(deps, as(b.id), id, 1, [T20, T20, T20]).ok).toBe(true);
    expect(commitVisit(deps, as(b.id), id, 2, [T20]).ok).toBe(false); // guest's turn: host only
    expect(undoVisit(deps, as(a.id), id)).toEqual({ ok: false, reason: "forbidden" }); // last visit was b's
    expect(commitVisit(deps, as(a.id), id, 2, [T20, T20, T20]).ok).toBe(true);
    expect(undoVisit(deps, as(b.id), id)).toEqual({ ok: false, reason: "forbidden" });
    expect(undoVisit(deps, as(a.id), id).ok).toBe(true);
  });
  it("publishes an event after commit, undo and cancel", () => {
    const published: string[] = [];
    deps.events = { publish: (id) => published.push(id) };
    const a = ok(createPlayer(deps, "Casey")).player;
    const id = createMatch(deps, { playerIds: [a.id], rules: { startScore: 501, inRule: "single", outRule: "double" }, starterIndex: 0, hostPlayerId: a.id });
    commitVisit(deps, as(a.id), id, 0, [T20, T20, T20]);
    undoVisit(deps, as(a.id), id);
    commitVisit(deps, as(a.id), id, 0, [T20]); // invalid (only one dart, no complete visit) → nothing
    cancelMatch(deps, as(a.id), id);
    expect(published).toEqual([id, id, id]);
  });
  it("matches older than 24 h are closed; the overview lists only open ones", () => {
    const a = ok(createPlayer(deps, "Casey")).player;
    const id = createMatch(deps, { playerIds: [a.id], rules: { startScore: 501, inRule: "single", outRule: "double" }, starterIndex: 0, hostPlayerId: a.id });
    expect(listOpenMatches(deps).map((m) => m.id)).toEqual([id]);
    n += 24 * 60 * 60 * 1000; // now() = 1000 + n
    expect(commitVisit(deps, as(a.id), id, 0, [T20])).toEqual({ ok: false, reason: "match-closed" });
    expect(listOpenMatches(deps)).toEqual([]);
    expect(cancelMatch(deps, as(a.id), id)).toEqual({ ok: false, reason: "match-closed" });
  });
});
