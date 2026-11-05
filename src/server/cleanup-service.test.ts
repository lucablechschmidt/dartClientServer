import { describe, expect, it } from "vitest";
import type { Session } from "@/domain/player";
import { deleteMatchAsAdmin, deleteTournamentWithMatches, listAllMatches, ADMIN_MATCH_PAGE } from "./cleanup-service";
import { createMatch, loadMatchView, listRecentMatches } from "./match-service";
import { createTournament, listTournaments, loadTournamentView, startFixture } from "./tournament-service";
import { memoryDeps, sqliteDeps } from "./testing";

const admin: Session = { playerId: "admin", name: "Admin", isAdmin: true };
const casey: Session = { playerId: "a", name: "Casey", isAdmin: false };
const rules = { startScore: 301, inRule: "single", outRule: "single" } as const;

describe.each([
  ["memory", () => memoryDeps()],
  ["sqlite", () => sqliteDeps()],
])("clean-up for the admin (%s)", (_name, make) => {
  const setup = () => {
    let clock = 1_000;
    const d = make();
    d.now = () => (clock += 10);
    const published: string[] = [];
    d.events = { publish: (id) => published.push(id) };
    for (const [id, name] of [
      ["a", "Casey"],
      ["b", "Sam"],
      ["c", "Kim"],
    ])
      d.players.createPlayer({ id, name, createdAt: 1, guestUntil: null });
    const match = () => createMatch(d, { playerIds: ["a", "b"], rules });
    return { d, published, match };
  };

  it("lists every match newest first in pages of 20, with names and a tournament mark", () => {
    const { d, match } = setup();
    const ids = Array.from({ length: ADMIN_MATCH_PAGE + 1 }, () => match());
    const first = listAllMatches(d, admin, 0);
    expect(first).toMatchObject({ ok: true, hasMore: true });
    if (!first.ok) return;
    expect(first.items).toHaveLength(ADMIN_MATCH_PAGE);
    expect(first.items[0]).toMatchObject({ id: ids.at(-1), mode: "x01", names: ["Casey", "Sam"], status: "running", isTournament: false });
    const second = listAllMatches(d, admin, ADMIN_MATCH_PAGE);
    expect(second).toMatchObject({ ok: true, hasMore: false, items: [{ id: ids[0] }] });
    expect(listAllMatches(d, casey, 0)).toEqual({ ok: false, reason: "forbidden" });
  });

  it("deleting a match removes it everywhere (history, overview) and tells open screens", () => {
    const { d, published, match } = setup();
    const id = match();
    d.matches.setMatchStatus(id, "finished", 50);
    expect(deleteMatchAsAdmin(d, casey, id)).toEqual({ ok: false, reason: "forbidden" });
    expect(deleteMatchAsAdmin(d, admin, id)).toEqual({ ok: true });
    expect(loadMatchView(d, id)).toBeNull();
    expect(listRecentMatches(d).map((m) => m.id)).not.toContain(id);
    expect(published).toEqual([id]);
    expect(deleteMatchAsAdmin(d, admin, id)).toEqual({ ok: false, reason: "not-found" });
  });

  it("a deleted tournament game opens its fixture again", () => {
    const { d } = setup();
    const t = createTournament(d, casey, { name: "Cup", format: "knockout", playerIds: ["a", "b"], rules });
    const fixture = loadTournamentView(d, casey, t)!.fixtures[0];
    const m = startFixture(d, casey, t, fixture.id);
    if (!m.ok) throw new Error(m.reason);
    expect(deleteMatchAsAdmin(d, admin, m.matchId)).toEqual({ ok: true });
    expect(loadTournamentView(d, casey, t)!.fixtures[0]).toMatchObject({ status: "ready", matchId: null });
  });

  it("deleting a tournament takes all its games with it; other matches stay", () => {
    const { d, published, match } = setup();
    const other = match();
    const t = createTournament(d, casey, { name: "Cup", format: "round-robin", playerIds: ["a", "b", "c"], rules });
    const games = loadTournamentView(d, casey, t)!
      .fixtures.filter((f) => f.status === "ready")
      .map((f) => {
        const r = startFixture(d, casey, t, f.id);
        if (!r.ok) throw new Error(r.reason);
        return r.matchId;
      });
    expect(games.length).toBeGreaterThan(0);
    expect(deleteTournamentWithMatches(d, casey, t)).toEqual({ ok: false, reason: "forbidden" });
    expect(deleteTournamentWithMatches(d, admin, t)).toEqual({ ok: true });
    expect(listTournaments(d)).toEqual([]);
    expect(games.map((g) => loadMatchView(d, g))).toEqual(games.map(() => null));
    expect(loadMatchView(d, other)).not.toBeNull();
    expect(published.sort()).toEqual([...games].sort());
    expect(deleteTournamentWithMatches(d, admin, t)).toEqual({ ok: false, reason: "not-found" });
  });
});
