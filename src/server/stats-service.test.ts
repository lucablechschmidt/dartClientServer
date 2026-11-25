import { describe, expect, it } from "vitest";
import type { Visit } from "@/domain/game";
import { hitsOf } from "@/domain/stats/field-hits";
import type { Session } from "@/domain/player";
import { de } from "@/i18n/de";
import type { Deps } from "./deps";
import { deletePlayer } from "./player-service";
import { leaderboards, matchDetail, myStats } from "./stats-service";
import { memoryDeps, sqliteDeps } from "./testing";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 400 * DAY;
const as = (playerId: string, isAdmin = false): Session => ({ playerId, name: playerId, isAdmin });
const v = (playerId: string, darts: [number, "single" | "double" | "triple"][], isBust = false): Visit => ({
  playerId,
  darts: darts.map(([field, type]) => ({ field, type })),
  isBust,
});
const MISS = (p: string) =>
  v(p, [
    [0, "single"],
    [0, "single"],
    [0, "single"],
  ]);

describe.each([
  ["memory", () => memoryDeps({ now: () => NOW })],
  ["sqlite", () => sqliteDeps({ now: () => NOW })],
])("stats service (%s)", (_name, make) => {
  let n = 0;
  /** A finished 301 single-out duel: a checks out with 180 + 121, b misses. */
  function duel(d: Deps, a: string, b: string, finishedAt: number, mode: "x01" | "cricket" = "x01") {
    const id = `m${++n}`;
    d.matches.createMatch({
      mode,
      id,
      legId: `${id}-l`,
      rules: { startScore: 301, inRule: "single", outRule: "single" },
      playerIds: [a, b],
      starterIndex: 0,
      format: { legsToWinSet: 1, setsToWinMatch: 1 },
      inputMode: "single",
      hostPlayerId: null,
      startedAt: finishedAt - 1,
    });
    if (mode === "x01") {
      const visits = [
        v(a, [
          [20, "triple"],
          [20, "triple"],
          [20, "triple"],
        ]),
        MISS(b),
        v(a, [
          [20, "triple"],
          [20, "triple"],
          [1, "single"],
        ]),
      ];
      d.matches.syncVisits(`${id}-l`, visits, 0, () => `${id}-v${++n}`, finishedAt);
    }
    d.matches.setMatchStatus(id, "finished", finishedAt);
    d.matches.setPlacements(id, { [a]: 1, [b]: 2 });
    return id;
  }
  const setup = () => {
    const d = make();
    for (const id of ["a", "b", "c"]) d.players.createPlayer({ id, name: id.toUpperCase(), createdAt: 1, guestUntil: null });
    d.players.createPlayer({ id: "g", name: "Gast", createdAt: 1, guestUntil: NOW + DAY });
    return d;
  };

  it("my statistics: games and wins per mode, x01 figures, history, field hits with the stored ones, recent games", () => {
    const d = setup();
    const m = duel(d, "a", "b", NOW - 10 * DAY);
    duel(d, "a", "b", NOW - 5 * DAY, "cricket");
    duel(d, "g", "a", NOW - DAY); // guest match: only field hits
    d.players.addFieldHits("a", new Map([[5, { single: 0, double: 0, triple: 1, unsplit: 0 }]]));
    const s = myStats(d, as("a"), "all");
    expect(s.records).toEqual({ x01: { games: 1, wins: 1 }, cricket: { games: 1, wins: 1 } });
    // the Cricket duel has no visits: 0 points at the end; X01 has no such figures
    expect(s.points).toEqual({ cricket: { games: 1, highScore: 0, average: 0 } });
    expect(s.x01).toMatchObject({ visits: 2, average: (180 + 121) / 2, count180: 1, highestFinish: 121, bestLeg: { 301: 6 } });
    expect(s.history).toEqual([{ matchId: m, finishedAt: NOW - 10 * DAY, average: 150.5 }]);
    expect(new Map(s.fieldHits.map(([f, c]) => [f, hitsOf(c)]))).toEqual(
      new Map([
        [20, 15],
        [1, 1],
        [5, 3],
      ]),
    ); // the guest match's a missed
    expect(new Map(s.fieldHits).get(5)).toEqual({ single: 0, double: 0, triple: 1, unsplit: 0 });
    expect(s.recent.map((r) => [r.mode, r.place, r.detail])).toEqual([
      ["x01", 2, true],
      ["cricket", 1, false],
      ["x01", 1, true],
    ]);
    expect(s.recent[2].names).toEqual(["A", "B"]);
  });

  it("the time filter leaves older matches out; stored field hits only count for 'all'", () => {
    const d = setup();
    duel(d, "a", "b", NOW - 40 * DAY);
    duel(d, "a", "b", NOW - 10 * DAY);
    d.players.addFieldHits("a", new Map([[5, { single: 0, double: 0, triple: 1, unsplit: 0 }]]));
    const s = myStats(d, as("a"), "30d");
    expect(s.records).toEqual({ x01: { games: 1, wins: 1 } });
    expect(new Map(s.fieldHits).get(5)).toBeUndefined();
  });

  it("Cricket points at the end: high score and average of own counted games, guests and the range left out", () => {
    const d = setup();
    const T20 = v("a", [
      [20, "triple"],
      [20, "triple"],
      [20, "triple"],
    ]);
    // T20 closes 20, two more T20 score 120; b, who wins this duel on paper, has no say
    const play = (a: string, b: string, finishedAt: number) => {
      const id = duel(d, a, b, finishedAt, "cricket");
      d.matches.syncVisits(`${id}-l`, [T20], 0, () => `${id}-x${++n}`, finishedAt);
    };
    play("b", "a", NOW - 2 * DAY);
    duel(d, "a", "b", NOW - 3 * DAY, "cricket"); // no visits: 0 points
    play("g", "a", NOW - DAY); // guest game: counts nowhere
    duel(d, "a", "b", NOW - 40 * DAY, "cricket"); // outside 30 days
    expect(myStats(d, as("a"), "all").points).toEqual({ cricket: { games: 3, highScore: 120, average: 40 } });
    expect(myStats(d, as("a"), "30d").points).toEqual({ cricket: { games: 2, highScore: 120, average: 60 } });
    expect(myStats(d, as("c"), "all").points).toEqual({});
  });

  it("rankings per mode for everyone: rounded Elo, own place; deleted players hidden", () => {
    const d = setup();
    duel(d, "a", "b", NOW - 3 * DAY);
    duel(d, "c", "a", NOW - 2 * DAY);
    const ranks = leaderboards(d, as("b"));
    const x01 = ranks.find((r) => r.mode === "x01")!;
    expect(x01.rows.map((r) => [r.name, r.place])).toEqual([
      ["C", 1],
      ["A", 2],
      ["B", 3],
    ]);
    expect(x01.rows[0].elo).toBe(Math.round(x01.rows[0].elo));
    expect(x01.own).toMatchObject({ name: "B", place: 3, elo: 984, games: 1 });
    expect(x01.history.b.map((p) => [p.finishedAt, p.elo])).toEqual([[NOW - 3 * DAY, 984]]);
    expect(x01.history.a.map((p) => p.elo)).toEqual([1016, 999]);
    expect(ranks.find((r) => r.mode === "cricket")).toEqual({ mode: "cricket", rows: [], own: null, history: {} });
    deletePlayer(d, as("admin", true), "c");
    expect(Object.keys(leaderboards(d, as("b")).find((r) => r.mode === "x01")!.history).sort()).toEqual(["a", "b"]);
    expect(
      leaderboards(d, as("b"))
        .find((r) => r.mode === "x01")!
        .rows.map((r) => r.name),
    ).toEqual(["A", "B"]);
  });

  it("match detail: x01 legs with every visit, rest and average, only for the players of the match", () => {
    const d = setup();
    const m = duel(d, "a", "b", NOW - DAY);
    const r = matchDetail(d, as("b"), m);
    if (!r.ok) throw new Error(r.reason);
    expect(r.detail.players.map((p) => p.name)).toEqual(["A", "B"]);
    if (r.detail.mode !== "x01") throw new Error(r.detail.mode);
    const leg = r.detail.legs[0];
    expect(leg.winner).toBe("a");
    expect(leg.rows[0].visits.map((x) => [x.darts.join(" "), x.points, x.rest])).toEqual([
      ["T20 T20 T20", 180, 121],
      ["T20 T20 1", 121, 0],
    ]);
    expect(leg.rows[0].average).toBeCloseTo(150.5);
    expect(leg.rows[1].visits[0]).toMatchObject({ points: 0, rest: 301, bust: false });
    expect(matchDetail(d, as("c"), m)).toEqual({ ok: false, reason: "forbidden" });
    expect(matchDetail(d, as("admin", true), m)).toEqual({ ok: false, reason: "forbidden" });
    expect(matchDetail(d, as("a"), "nope")).toEqual({ ok: false, reason: "not-found" });
    expect(matchDetail(d, as("a"), duel(d, "a", "b", NOW, "cricket"))).toEqual({ ok: false, reason: "not-found" });
  });

  it("match detail: splitscore rounds with each player's darts, change and score; listed in the recent games", () => {
    const d = setup();
    d.matches.createMatch({
      mode: "splitscore",
      id: "s1",
      legId: "s1-l",
      rules: { startScore: 40, inRule: "single", outRule: "single" },
      playerIds: ["a", "b"],
      starterIndex: 0,
      format: { legsToWinSet: 1, setsToWinMatch: 1 },
      inputMode: "single",
      hostPlayerId: null,
      startedAt: NOW - 2,
    });
    const over = { field: 0, type: "overthrown" } as const;
    const off = (p: string): Visit => ({ playerId: p, darts: [over, over, over], isBust: false });
    // round 15: a S15 D15 and a miss (+45 → 85), b misses (20); then both miss everything, b hits bull at the end
    const visits = [
      { playerId: "a", darts: [{ field: 15, type: "single" }, { field: 15, type: "double" }, over], isBust: false } satisfies Visit,
      off("b"),
      ...Array.from({ length: 7 }, () => [off("a"), off("b")]).flat(),
      off("a"),
      { playerId: "b", darts: [{ field: 25, type: "single" }, over, over], isBust: false } satisfies Visit,
    ];
    d.matches.syncVisits("s1-l", visits, 0, () => `s1-v${++n}`, NOW - 1);
    d.matches.setMatchStatus("s1", "finished", NOW - 1);
    d.matches.setPlacements("s1", { b: 1, a: 2 });
    const r = matchDetail(d, as("a"), "s1");
    if (!r.ok) throw new Error(r.reason);
    if (r.detail.mode !== "splitscore") throw new Error(r.detail.mode);
    expect(r.detail.rounds.map((x) => x.target)).toEqual(["15", "16", "double", "17", "18", "triple", "19", "20", "bull"]);
    expect(r.detail.rounds[0].cells).toEqual({
      a: { darts: ["15", "D15", "✕"], hit: true, change: 45, score: 85 },
      b: { darts: ["✕", "✕", "✕"], hit: false, change: -20, score: 20 },
    });
    expect(r.detail.rounds.at(-1)?.cells.b).toMatchObject({ hit: true, change: 25, score: 26 });
    expect(r.detail.winners).toEqual(["b"]);
    expect(myStats(d, as("a"), "all").recent.find((m) => m.id === "s1")?.detail).toBe(true);
    expect(matchDetail(d, as("c"), "s1")).toEqual({ ok: false, reason: "forbidden" });
  });

  it("a deleted opponent is shown with the mark in my recent games", () => {
    const d = setup();
    duel(d, "a", "b", NOW - DAY);
    deletePlayer(d, as("admin", true), "b");
    expect(myStats(d, as("a"), "all").recent[0].names).toEqual(["A", de.players.deletedName.replace("{name}", "B")]);
  });
});
