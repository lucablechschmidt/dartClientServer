import { describe, expect, it } from "vitest";
import { openDatabase } from "./client";
import { MemoryMatchRepository } from "./memory-match-repository";
import { MemoryPlayerRepository } from "./memory-player-repository";
import { MemoryStore } from "./memory-store";
import { MemoryTournamentRepository } from "./memory-tournament-repository";
import type { MatchRepository, PlayerRepository } from "./repository";
import { SqliteMatchRepository } from "./sqlite-match-repository";
import { SqlitePlayerRepository } from "./sqlite-player-repository";
import { SqliteTournamentRepository } from "./sqlite-tournament-repository";
import type { NewTournament, TournamentRepository } from "./tournament-repository";

type Repos = { players: PlayerRepository; matches: MatchRepository; tournaments: TournamentRepository };
const impls: [string, () => Repos][] = [
  [
    "sqlite (in-memory file)",
    () => {
      const db = openDatabase(":memory:");
      return {
        players: new SqlitePlayerRepository(db),
        matches: new SqliteMatchRepository(db),
        tournaments: new SqliteTournamentRepository(db),
      };
    },
  ],
  [
    "memory",
    () => {
      const store = new MemoryStore();
      return {
        players: new MemoryPlayerRepository(store),
        matches: new MemoryMatchRepository(store),
        tournaments: new MemoryTournamentRepository(store),
      };
    },
  ],
];

const rules = { startScore: 501, inRule: "single", outRule: "double" } as const;
const tournament = (id: string, createdAt: number): NewTournament => ({
  id,
  name: `T ${id}`,
  format: "knockout",
  groupCount: 1,
  advancePerGroup: 2,
  rules,
  inputMode: "single",
  createdBy: "p1",
  createdAt,
  seeds: ["p2", "p1", "p3"],
  roundFormats: [
    { phase: "group", round: 0, legsToWinSet: 1, setsToWinMatch: 1 },
    { phase: "knockout", round: 2, legsToWinSet: 3, setsToWinMatch: 1 },
  ],
});

describe.each(impls)("tournament repository: %s", (_name, make) => {
  const seed = (r: Repos) => {
    for (const [i, name] of ["Casey", "Sam", "Kim"].entries())
      r.players.createPlayer({ id: `p${i + 1}`, name, createdAt: i, guestUntil: null });
  };

  it("stores seeds in order, round formats and match links; lists newest first", () => {
    const r = make();
    seed(r);
    r.tournaments.createTournament(tournament("t1", 10));
    r.tournaments.createTournament(tournament("t2", 20));
    const t = r.tournaments.loadTournament("t1")!;
    expect(t.seeds.map((p) => p.id)).toEqual(["p2", "p1", "p3"]);
    expect(t.rules).toEqual(rules);
    expect(t.roundFormats).toContainEqual({ phase: "knockout", round: 2, legsToWinSet: 3, setsToWinMatch: 1 });
    expect(r.tournaments.listTournaments().map((x) => x.id)).toEqual(["t2", "t1"]);
    r.matches.createMatch({
      mode: "x01",
      id: "m1",
      legId: "l1",
      rules,
      playerIds: ["p1", "p3"],
      starterIndex: 0,
      format: { legsToWinSet: 1, setsToWinMatch: 1 },
      inputMode: "single",
      hostPlayerId: null,
      startedAt: 30,
      isTournament: true,
    });
    r.matches.createMatch({
      mode: "x01",
      id: "m2",
      legId: "l2",
      rules,
      playerIds: ["p1", "p3"],
      starterIndex: 0,
      format: { legsToWinSet: 1, setsToWinMatch: 1 },
      inputMode: "single",
      hostPlayerId: null,
      startedAt: 31,
      isTournament: true,
    });
    r.tournaments.linkMatch("t1", "k-r1-s2", "m1");
    r.tournaments.linkMatch("t1", "k-r1-s2", "m2"); // relink after a cancelled match
    expect(r.tournaments.loadTournament("t1")!.links).toEqual([{ fixtureId: "k-r1-s2", matchId: "m2" }]);
    expect(r.tournaments.fixtureOfMatch("m2")).toEqual({ tournamentId: "t1", fixtureId: "k-r1-s2" });
    expect(r.tournaments.fixtureOfMatch("m1")).toBeNull();
    expect(r.matches.loadMatch("m2")!.isTournament).toBe(true);
  });

  it("redraws the seed list of one tournament only; delete keeps the matches", () => {
    const r = make();
    seed(r);
    r.tournaments.createTournament(tournament("t1", 10));
    r.tournaments.createTournament(tournament("t2", 20));
    r.tournaments.setSeeds("t1", ["p3", "p2", "p1"]);
    expect(r.tournaments.loadTournament("t1")!.seeds.map((p) => p.id)).toEqual(["p3", "p2", "p1"]);
    expect(r.tournaments.loadTournament("t2")!.seeds.map((p) => p.id)).toEqual(["p2", "p1", "p3"]);
    r.matches.createMatch({
      mode: "x01",
      id: "m1",
      legId: "l1",
      rules,
      playerIds: ["p1", "p3"],
      starterIndex: 0,
      format: { legsToWinSet: 1, setsToWinMatch: 1 },
      inputMode: "single",
      hostPlayerId: null,
      startedAt: 30,
    });
    r.tournaments.linkMatch("t1", "k-r1-s2", "m1");
    r.tournaments.deleteTournament("t1");
    expect(r.tournaments.loadTournament("t1")).toBeNull();
    expect(r.tournaments.fixtureOfMatch("m1")).toBeNull();
    expect(r.matches.loadMatch("m1")).not.toBeNull();
  });
});
