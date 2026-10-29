import { beforeEach, describe, expect, it } from "vitest";
import type { Session } from "@/domain/player";
import type { Dart } from "@/domain/x01";
import { memoryDeps } from "./testing";
import { cancelMatch, commitVisit, createMatch, listOpenMatches, listRecentMatches, loadMatchView, restartMatch, setPlayOut, setStarter, undoVisit } from "./match-service";
import { createGuest, createPlayer } from "./player-service";

const ok = <T extends { ok: boolean }>(r: T) => { if (!r.ok) throw new Error("expected ok"); return r as Extract<T, { ok: true }>; };
const sessionAdmin = { playerId: "admin-session", name: "Admin", isAdmin: true };
let deps: ReturnType<typeof memoryDeps>;
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
    let r = commitVisit(deps, sessionAdmin, id, 0, 0, [T20, T20, T20]);
    if (!r.ok) throw new Error(r.reason);
    expect(r.view.board.players[0].rest).toBe(321);
    expect(r.view.board.activePlayerId).toBe(b.id);
    expect(loadMatchView(deps, id)!.board).toEqual(r.view.board);
    // same or later position → the client is stale
    expect(commitVisit(deps, sessionAdmin, id, 0, 0, [T20, T20, T20])).toEqual({ ok: false, reason: "out-of-sync" });
    expect(commitVisit(deps, sessionAdmin, id, 0, 2, [T20, T20, T20])).toEqual({ ok: false, reason: "out-of-sync" });
    // incomplete visit without bust or checkout
    expect(commitVisit(deps, sessionAdmin, id, 0, 1, [T20, T20])).toEqual({ ok: false, reason: "out-of-sync" });
    r = commitVisit(deps, sessionAdmin, id, 0, 1, [T20, T20, T20]);
    expect(r.ok).toBe(true);
  });

  it("replays a bust from the thrown darts and stores overthrown slots", () => {
    const { id } = setup(301);
    commitVisit(deps, sessionAdmin, id, 0, 0, [T20, T20, T20]); // 121
    commitVisit(deps, sessionAdmin, id, 0, 1, miss3);
    // Casey: T20 (61), T20 → 1 left under double-out = bust; the second T20 is not stored
    const r = commitVisit(deps, sessionAdmin, id, 0, 2, [T20, T20]);
    if (!r.ok) throw new Error(r.reason);
    expect(r.view.board.players[0].rest).toBe(121);
    expect(r.view.board.players[0].isBust).toBe(true);
    const stored = loadMatchView(deps, id)!.state.legs[0].visits[2];
    expect(stored.isBust).toBe(true);
    expect(stored.darts.map((d) => d.type)).toEqual(["triple", "overthrown", "overthrown"]);
    // a third dart after the bust no longer belongs to this visit
    expect(undoVisit(deps, sessionAdmin, id).ok).toBe(true);
    expect(commitVisit(deps, sessionAdmin, id, 0, 2, [T20, T20, S(1)])).toEqual({ ok: false, reason: "out-of-sync" });
  });

  it("rejects unknown matches and invalid darts", () => {
    const { id } = setup(301);
    expect(commitVisit(deps, sessionAdmin, "nope", 0, 0, [T20])).toEqual({ ok: false, reason: "not-found" });
    expect(commitVisit(deps, sessionAdmin, id, 0, 0, [{ field: 25, type: "triple" }])).toEqual({ ok: false, reason: "invalid-dart" });
    expect(commitVisit(deps, sessionAdmin, id, 0, 0, [])).toEqual({ ok: false, reason: "invalid-dart" });
  });

  it("finishes the match on a checkout visit and reopens it on undo", () => {
    const { id, a } = setup(301);
    commitVisit(deps, sessionAdmin, id, 0, 0, [T20, T20, T20]); // 121
    commitVisit(deps, sessionAdmin, id, 0, 1, miss3);
    const last = commitVisit(deps, sessionAdmin, id, 0, 2, [T20, { field: 11, type: "triple" }, { field: 14, type: "double" }]);
    if (!last.ok) throw new Error(last.reason);
    expect(last.view.board.winnerId).toBe(a.id);
    expect(last.view.status).toBe("finished");
    expect(loadMatchView(deps, id)!.status).toBe("finished");
    expect(commitVisit(deps, sessionAdmin, id, 0, 3, [T20, T20, T20])).toEqual({ ok: false, reason: "leg-finished" });

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
    commitVisit(deps, sessionAdmin, id, 0, 0, [S(20), S(20), S(20)]);
    commitVisit(deps, sessionAdmin, id, 0, 1, [S(5), S(5), S(5)]);
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
    expect(commitVisit(deps, as(b.id), id, 0, 0, [T20, T20, T20])).toEqual({ ok: false, reason: "forbidden" });
    const r = commitVisit(deps, as(a.id), id, 0, 0, [T20, T20, T20]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.view.access).toEqual({ isOpen: true, canEnter: true, canUndo: true, canCancel: true });
    expect(loadMatchView(deps, id, as(b.id))!.access).toEqual({ isOpen: true, canEnter: false, canUndo: false, canCancel: false });
    expect(undoVisit(deps, as(b.id), id)).toEqual({ ok: false, reason: "forbidden" });
    expect(cancelMatch(deps, as(b.id), id)).toEqual({ ok: false, reason: "forbidden" });
    expect(cancelMatch(deps, as(a.id), id)).toEqual({ ok: true });
    expect(commitVisit(deps, as(a.id), id, 0, 1, [T20])).toEqual({ ok: false, reason: "match-closed" });
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
    expect(commitVisit(deps, as(b.id), id, 0, 0, [T20]).ok).toBe(false);
    expect(commitVisit(deps, as(a.id), id, 0, 0, [T20, T20, T20]).ok).toBe(true);
    expect(commitVisit(deps, as(a.id), id, 0, 1, [T20]).ok).toBe(false); // b's turn, not the host
    expect(commitVisit(deps, as(b.id), id, 0, 1, [T20, T20, T20]).ok).toBe(true);
    expect(commitVisit(deps, as(b.id), id, 0, 2, [T20]).ok).toBe(false); // guest's turn: host only
    expect(undoVisit(deps, as(a.id), id)).toEqual({ ok: false, reason: "forbidden" }); // last visit was b's
    expect(commitVisit(deps, as(a.id), id, 0, 2, [T20, T20, T20]).ok).toBe(true);
    expect(undoVisit(deps, as(b.id), id)).toEqual({ ok: false, reason: "forbidden" });
    expect(undoVisit(deps, as(a.id), id).ok).toBe(true);
  });
  it("publishes an event after commit, undo and cancel", () => {
    const published: string[] = [];
    deps.events = { publish: (id) => published.push(id) };
    const a = ok(createPlayer(deps, "Casey")).player;
    const id = createMatch(deps, { playerIds: [a.id], rules: { startScore: 501, inRule: "single", outRule: "double" }, starterIndex: 0, hostPlayerId: a.id });
    commitVisit(deps, as(a.id), id, 0, 0, [T20, T20, T20]);
    undoVisit(deps, as(a.id), id);
    commitVisit(deps, as(a.id), id, 0, 0, [T20]); // invalid (only one dart, no complete visit) → nothing
    cancelMatch(deps, as(a.id), id);
    expect(published).toEqual([id, id, id]);
  });
  it("matches older than 24 h are closed; the overview lists only open ones", () => {
    const a = ok(createPlayer(deps, "Casey")).player;
    const id = createMatch(deps, { playerIds: [a.id], rules: { startScore: 501, inRule: "single", outRule: "double" }, starterIndex: 0, hostPlayerId: a.id });
    expect(listOpenMatches(deps).map((m) => m.id)).toEqual([id]);
    n += 24 * 60 * 60 * 1000; // now() = 1000 + n
    expect(commitVisit(deps, as(a.id), id, 0, 0, [T20])).toEqual({ ok: false, reason: "match-closed" });
    expect(listOpenMatches(deps)).toEqual([]);
    expect(cancelMatch(deps, as(a.id), id)).toEqual({ ok: false, reason: "match-closed" });
  });
});

describe("legs, sets and places (M5)", () => {
  const short = { startScore: 40, inRule: "single", outRule: "single" } as const;
  const OUT: Dart[] = [{ field: 20, type: "double" }];
  const MISS: Dart[] = [{ field: 0, type: "single" }, { field: 0, type: "single" }, { field: 0, type: "single" }];
  const players = (...names: string[]) => names.map((name) => ok(createPlayer(deps, name)).player.id);
  /** Commits a visit at the position the server expects (next leg after a finished one). */
  const commit = (id: string, darts: Dart[], session: Session = sessionAdmin) => {
    const v = loadMatchView(deps, id)!;
    const legFinished = v.board.winnerId !== null && v.status === "running";
    const legIndex = legFinished ? v.state.legs.length : v.state.legs.length - 1;
    const seq = legFinished ? 0 : v.state.legs[legIndex].visits.length;
    return ok(commitVisit(deps, session, id, legIndex, seq, darts)).view;
  };

  it("best of 3 legs completely over commitVisit: the next leg appears with its first visit", () => {
    const [a, b] = players("Casey", "Sam");
    const id = createMatch(deps, { playerIds: [a, b], rules: short, format: { legsToWinSet: 2, setsToWinMatch: 1 } });
    let v = commit(id, OUT); // leg 1: Casey
    expect(v.status).toBe("running");
    expect(v.state.legs).toHaveLength(1);
    // the stale position (old leg) is rejected
    expect(commitVisit(deps, sessionAdmin, id, 0, 1, MISS)).toEqual({ ok: false, reason: "out-of-sync" });
    v = commit(id, MISS); // leg 2: Sam starts and misses
    expect(v.state.legs).toHaveLength(2);
    expect(v.state.legs[1].visits[0].playerId).toBe(b);
    v = commit(id, OUT); // Casey wins leg 2 → match
    expect(v.status).toBe("finished");
    expect(deps.matches.loadMatch(id)!.legs.map((l) => [l.setNo, l.legNo, l.winnerPlayerId])).toEqual([[1, 1, a], [1, 2, a]]);
  });

  it("undo across the leg boundary deletes the emptied leg and reopens the previous one", () => {
    const [a, b] = players("Casey", "Sam");
    const id = createMatch(deps, { playerIds: [a, b], rules: short, format: { legsToWinSet: 2, setsToWinMatch: 1 } });
    commit(id, OUT);
    commit(id, MISS);
    let u = ok(undoVisit(deps, sessionAdmin, id)).view;
    expect(u.state.legs).toHaveLength(1);
    expect(deps.matches.loadMatch(id)!.legs).toHaveLength(1);
    u = ok(undoVisit(deps, sessionAdmin, id)).view;
    expect(u.board.winnerId).toBeNull();
    expect(deps.matches.loadMatch(id)!.legs[0].winnerPlayerId).toBeNull();
  });

  it("4 players: one leg down to place 4, places stored, sets and legs forced to 1 (E7)", () => {
    const ids = players("A", "B", "C", "D");
    const id = createMatch(deps, { playerIds: ids, rules: short, format: { legsToWinSet: 3, setsToWinMatch: 3 } });
    expect(loadMatchView(deps, id)!.format).toEqual({ legsToWinSet: 1, setsToWinMatch: 1 });
    commit(id, MISS); // A
    commit(id, MISS); // B
    commit(id, OUT); // C: place 1
    expect(loadMatchView(deps, id)!.status).toBe("running");
    commit(id, OUT); // D: place 2
    const v = commit(id, OUT); // A: place 3, B last
    expect(v.status).toBe("finished");
    expect(deps.store.matches.get(id)!.placements).toEqual({ [ids[0]]: 3, [ids[1]]: 4, [ids[2]]: 1, [ids[3]]: 2 });
  });

  it("the last player plays out and resigns; the places never change", () => {
    const ids = players("A", "B", "C");
    const id = createMatch(deps, { playerIds: ids, rules: short });
    commit(id, OUT);
    commit(id, OUT); // C is last, match finished
    let v = ok(setPlayOut(deps, sessionAdmin, id, true)).view;
    expect(v.status).toBe("running");
    expect(v.board.activePlayerId).toBe(ids[2]);
    expect(setPlayOut(deps, sessionAdmin, id, true)).toEqual({ ok: false, reason: "no-play-out" });
    v = commit(id, MISS);
    v = ok(setPlayOut(deps, sessionAdmin, id, false)).view; // resign
    expect(v.status).toBe("finished");
    expect(v.state.legs[0].visits).toHaveLength(3);
    // undo of the resign: playing out again, nothing else changes
    v = ok(undoVisit(deps, sessionAdmin, id)).view;
    expect(v.status).toBe("running");
    expect(v.state.legs[0].playOut).toBe(true);
    // checkout ends it
    v = commit(id, OUT);
    expect(v.status).toBe("finished");
    expect(deps.matches.loadMatch(id)!.state.legs[0].playOut).toBe(true);
  });

  it("play-out only by whoever enters for the last player", () => {
    const ids = players("A", "B", "C");
    const id = createMatch(deps, { playerIds: ids, rules: short, hostPlayerId: ids[0] });
    const host = { playerId: ids[0], name: "A", isAdmin: false };
    commit(id, OUT, host);
    commit(id, OUT, host);
    expect(setPlayOut(deps, { playerId: ids[2], name: "C", isAdmin: false }, id, true)).toEqual({ ok: false, reason: "forbidden" });
    expect(setPlayOut(deps, { playerId: ids[0], name: "A", isAdmin: false }, id, true).ok).toBe(true);
  });

  it("starter: host or admin before the first dart; between legs for the next leg", () => {
    const [a, b] = players("Casey", "Sam");
    const id = createMatch(deps, { playerIds: [a, b], rules: short, format: { legsToWinSet: 2, setsToWinMatch: 1 }, hostPlayerId: a });
    const host = { playerId: a, name: "Casey", isAdmin: false };
    expect(setStarter(deps, { playerId: b, name: "Sam", isAdmin: false }, id, b)).toEqual({ ok: false, reason: "forbidden" });
    let v = ok(setStarter(deps, sessionAdmin, id, b)).view;
    expect(v.board.activePlayerId).toBe(b);
    commit(id, OUT, host); // Sam wins leg 1
    v = ok(setStarter(deps, host, id, b)).view; // Sam starts leg 2 too
    expect(v.state.legs).toHaveLength(2);
    expect(v.board.activePlayerId).toBe(b);
    expect(ok(commitVisit(deps, host, id, 1, 0, MISS)).view.state.legs[1].visits[0].playerId).toBe(b);
    expect(setStarter(deps, sessionAdmin, id, a)).toEqual({ ok: false, reason: "leg-started" });
  });

  it("history: score for best-of, places for 3+, winner for single legs, abandoned marked; running ones not listed", () => {
    const [a, b, c] = players("Casey", "Sam", "Kim");
    const bo3 = createMatch(deps, { playerIds: [a, b], rules: short, format: { legsToWinSet: 2, setsToWinMatch: 1 } });
    commit(bo3, OUT); // Casey
    commit(bo3, OUT); // Sam starts leg 2 and wins
    commit(bo3, MISS); // leg 3: Casey starts, misses
    commit(bo3, OUT); // Sam: 2:1
    const three = createMatch(deps, { playerIds: [a, b, c], rules: short });
    commit(three, OUT);
    commit(three, OUT); // Kim last
    const single = createMatch(deps, { playerIds: [a, b], rules: short });
    commit(single, OUT);
    const gone = createMatch(deps, { playerIds: [a, b], rules: short });
    cancelMatch(deps, sessionAdmin, gone);
    createMatch(deps, { playerIds: [a, b], rules: short }); // running
    const recent = listRecentMatches(deps);
    expect(recent.map((m) => [m.id, m.result])).toEqual([
      [gone, { kind: "abandoned" }],
      [single, { kind: "winner", winner: "Casey" }],
      [three, { kind: "places", order: ["Casey", "Sam", "Kim"] }],
      [bo3, { kind: "score", winner: "Sam", unit: "legs", score: [2, 1] }],
    ]);
    expect(recent[0].names).toEqual(["Casey", "Sam"]);
  });

  it("restart keeps the format", () => {
    const [a, b] = players("Casey", "Sam");
    const id = createMatch(deps, { playerIds: [a, b], rules: short, format: { legsToWinSet: 2, setsToWinMatch: 2 } });
    expect(loadMatchView(deps, restartMatch(deps, id)!)!.format).toEqual({ legsToWinSet: 2, setsToWinMatch: 2 });
  });
});
