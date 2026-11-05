import { describe, expect, it } from "vitest";
import type { Visit } from "@/domain/game";
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
    d.players.addFieldHits("a", new Map([[5, 3]]));
    const s = myStats(d, as("a"), "all");
    expect(s.records).toEqual({ x01: { games: 1, wins: 1 }, cricket: { games: 1, wins: 1 } });
    expect(s.x01).toMatchObject({ visits: 2, average: (180 + 121) / 2, count180: 1, highestFinish: 121, bestLeg: { 301: 6 } });
    expect(s.history).toEqual([{ matchId: m, finishedAt: NOW - 10 * DAY, average: 150.5 }]);
    expect(new Map(s.fieldHits)).toEqual(
      new Map([
        [20, 15],
        [1, 1],
        [5, 3],
      ]),
    ); // the guest match's a missed
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
    d.players.addFieldHits("a", new Map([[5, 3]]));
    const s = myStats(d, as("a"), "30d");
    expect(s.records).toEqual({ x01: { games: 1, wins: 1 } });
    expect(new Map(s.fieldHits).get(5)).toBeUndefined();
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
    expect(ranks.find((r) => r.mode === "cricket")).toEqual({ mode: "cricket", rows: [], own: null });
    deletePlayer(d, as("admin", true), "c");
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

  it("a deleted opponent is shown with the mark in my recent games", () => {
    const d = setup();
    duel(d, "a", "b", NOW - DAY);
    deletePlayer(d, as("admin", true), "b");
    expect(myStats(d, as("a"), "all").recent[0].names).toEqual(["A", de.players.deletedName.replace("{name}", "B")]);
  });
});
