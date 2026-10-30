import { beforeEach, describe, expect, it } from "vitest";
import type { Dart } from "@/domain/game";
import type { Session } from "@/domain/player";
import { commitVisit, decideWinner, loadMatchView, undoVisit, cancelMatch } from "./match-service";
import { createPlayer } from "./player-service";
import {
  createTournament,
  deleteTournament,
  listTournaments,
  loadTournamentView,
  redrawTournament,
  startFixture,
  tournamentOfMatch,
  type NewTournamentInput,
} from "./tournament-service";
import { memoryDeps, seededRandom } from "./testing";

const ok = <T extends { ok: boolean }>(r: T) => {
  if (!r.ok) throw new Error(`expected ok: ${JSON.stringify(r)}`);
  return r as Extract<T, { ok: true }>;
};
const rules = { startScore: 40, inRule: "single", outRule: "single" } as const;
const OUT: Dart[] = [{ field: 20, type: "double" }];

let deps: ReturnType<typeof memoryDeps>;
let host: Session;
let ids: string[];
let n: number;
beforeEach(() => {
  n = 0;
  deps = memoryDeps({ newId: () => `id${++n}`, now: () => 1000 + n, random: seededRandom() });
  ids = ["Casey", "Sam", "Kim", "Lou", "Max", "Noa"].map((name) => ok(createPlayer(deps, name)).player.id);
  host = { playerId: ids[0], name: "Casey", isAdmin: false };
});
const create = (input: Partial<NewTournamentInput>) =>
  createTournament(deps, host, { name: "Freitag", format: "round-robin", playerIds: ids.slice(0, 4), rules, ...input });

/** Plays the fixture's match to its end: the player listed first ("a") checks out in one dart. */
function playFixture(tournamentId: string, fixtureId: string): string {
  const matchId = ok(startFixture(deps, host, tournamentId, fixtureId)).matchId;
  for (;;) {
    const v = loadMatchView(deps, matchId)!;
    if (v.status === "finished") return matchId;
    const legFinished = v.board.winnerId !== null;
    const legIndex = legFinished ? v.state.legs.length : v.state.legs.length - 1;
    const seq = legFinished ? 0 : v.state.legs[legIndex].visits.length;
    const turn = legFinished ? v.state.players[(v.state.legs.at(-1)!.starter + 1) % 2] : v.board.activePlayerId;
    const darts =
      turn === v.state.players[0]
        ? OUT
        : [{ field: 0, type: "single" } as Dart, { field: 0, type: "single" } as Dart, { field: 0, type: "single" } as Dart];
    ok(commitVisit(deps, host, matchId, legIndex, seq, darts));
  }
}

describe("tournaments (M9)", () => {
  it("creates a round robin with a drawn seed list; the table follows the results; the leader wins", () => {
    const id = create({});
    let v = loadTournamentView(deps, host, id)!;
    expect(v.players.map((p) => p.id).sort()).toEqual(ids.slice(0, 4).sort());
    expect(v.fixtures).toHaveLength(6);
    expect(v.canRedraw).toBe(true);
    for (const f of v.fixtures) playFixture(id, f.id);
    v = loadTournamentView(deps, host, id)!;
    expect(v.fixtures.every((f) => f.status === "done")).toBe(true);
    expect(v.groups[0].rows.reduce((s, r) => s + r.wins, 0)).toBe(6);
    expect(v.winner).toBe(v.groups[0].rows[0].player);
    expect(listTournaments(deps)[0]).toMatchObject({ name: "Freitag", format: "round-robin" });
    expect(listTournaments(deps)[0].winner).not.toBeNull();
  });

  it("redraw only by creator or admin and only before the first game", () => {
    const id = create({});
    const other = { playerId: ids[1], name: "Sam", isAdmin: false };
    expect(redrawTournament(deps, other, id)).toEqual({ ok: false, reason: "forbidden" });
    ok(redrawTournament(deps, host, id));
    const first = loadTournamentView(deps, host, id)!.fixtures[0];
    ok(startFixture(deps, other, id, first.id)); // anyone may start a game
    expect(redrawTournament(deps, host, id)).toEqual({ ok: false, reason: "already-started" });
    expect(loadTournamentView(deps, host, id)!.canRedraw).toBe(false);
  });

  it("starting twice opens the same match; a cancelled match frees the fixture again", () => {
    const id = create({});
    const f = loadTournamentView(deps, host, id)!.fixtures[0];
    const m1 = ok(startFixture(deps, host, id, f.id)).matchId;
    expect(ok(startFixture(deps, host, id, f.id)).matchId).toBe(m1);
    expect(tournamentOfMatch(deps, m1)).toBe(id);
    expect(loadMatchView(deps, m1)!.isTournament).toBe(true);
    ok(cancelMatch(deps, host, m1));
    const m2 = ok(startFixture(deps, host, id, f.id)).matchId;
    expect(m2).not.toBe(m1);
  });

  it("knockout with 6: byes for seeds 1 and 2, best of per round, the final decides", () => {
    const id = create({
      format: "knockout",
      playerIds: ids,
      knockoutFormats: [
        { legsToWinSet: 1, setsToWinMatch: 1 },
        { legsToWinSet: 1, setsToWinMatch: 1 },
        { legsToWinSet: 2, setsToWinMatch: 1 },
      ],
    });
    let v = loadTournamentView(deps, host, id)!;
    expect(v.fixtures.filter((f) => f.round === 1 && f.status === "bye")).toHaveLength(2);
    const final = v.fixtures.find((f) => f.round === 3)!;
    expect(final.format).toEqual({ legsToWinSet: 2, setsToWinMatch: 1 });
    expect(startFixture(deps, host, id, final.id)).toEqual({ ok: false, reason: "not-ready" });
    for (let round = 1; round <= 3; round++) {
      for (const f of loadTournamentView(deps, host, id)!.fixtures.filter((x) => x.round === round && x.status === "ready"))
        playFixture(id, f.id);
    }
    v = loadTournamentView(deps, host, id)!;
    expect(v.winner).toBe(v.fixtures.find((f) => f.round === 3)!.a);
    expect(v.fixtures.find((f) => f.round === 3)!.legs).toEqual([2, 0]);
  });

  it("a declared winner counts; undo of a finished game is locked once its winner's next game started", () => {
    const id = create({ format: "knockout", playerIds: ids.slice(0, 4), knockoutFormats: [{ legsToWinSet: 2, setsToWinMatch: 1 }] });
    const [semi1, semi2] = loadTournamentView(deps, host, id)!.fixtures.filter((f) => f.round === 1);
    const m1 = ok(startFixture(deps, host, id, semi1.id)).matchId;
    ok(commitVisit(deps, host, m1, 0, 0, OUT)); // a wins leg 1 of best of 3
    ok(decideWinner(deps, host, m1, semi1.b!)); // time is short: b is declared the winner
    playFixture(id, semi2.id);
    const final = loadTournamentView(deps, host, id)!.fixtures.find((f) => f.round === 2)!;
    expect(final.a).toBe(semi1.b);
    ok(startFixture(deps, host, id, final.id));
    expect(undoVisit(deps, host, m1)).toEqual({ ok: false, reason: "tournament-moved-on" });
  });

  it("groups + knockout: tables per group, the knockout opens when the groups are complete", () => {
    const id = create({ format: "groups-knockout", playerIds: ids.slice(0, 6), groups: 2, advance: 1 });
    let v = loadTournamentView(deps, host, id)!;
    expect(v.groups).toHaveLength(2);
    expect(v.fixtures.find((f) => f.phase === "knockout")!.status).toBe("waiting");
    for (const f of v.fixtures.filter((x) => x.phase === "group")) playFixture(id, f.id);
    v = loadTournamentView(deps, host, id)!;
    const final = v.fixtures.find((f) => f.phase === "knockout")!;
    expect(final.status).toBe("ready");
    expect([final.a, final.b]).toEqual([v.groups[0].rows[0].player, v.groups[1].rows[0].player]);
  });

  it("validates the setup and lets only creator or admin delete; the matches stay", () => {
    expect(() => create({ format: "groups-knockout", playerIds: ids.slice(0, 3), groups: 2 })).toThrow();
    expect(() => create({ format: "groups-knockout", playerIds: ids.slice(0, 4), groups: 2, advance: 4 })).toThrow();
    const id = create({});
    const m = ok(startFixture(deps, host, id, loadTournamentView(deps, host, id)!.fixtures[0].id)).matchId;
    expect(deleteTournament(deps, { playerId: ids[1], name: "Sam", isAdmin: false }, id)).toEqual({ ok: false, reason: "forbidden" });
    ok(deleteTournament(deps, { playerId: "admin", name: "Admin", isAdmin: true }, id));
    expect(loadTournamentView(deps, host, id)).toBeNull();
    expect(loadMatchView(deps, m)).not.toBeNull();
  });
});
