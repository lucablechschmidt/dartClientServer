import { describe, expect, it } from "vitest";
import { buildPlan, draw, resolve, standings, tournamentWinner, type FixtureResult, type Plan } from ".";

const players = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const pairKey = (a: string, b: string) => [a, b].sort().join("-");

/** Plays every ready fixture with `pick` deciding the winner, until nothing is ready any more. */
function playOut(
  plan: Plan,
  pick: (a: string, b: string) => string,
  legs: (w: string, l: string) => [number, number] = () => [2, 0],
): FixtureResult[] {
  const results: FixtureResult[] = [];
  for (;;) {
    const ready = resolve(plan, results).filter((f) => f.status === "ready");
    if (ready.length === 0) return results;
    for (const f of ready) {
      const [a, b] = [f.a!, f.b!];
      const winner = pick(a, b);
      const loser = winner === a ? b : a;
      const [lw, ll] = legs(winner, loser);
      results.push({ fixtureId: f.id, winner, legs: { [winner]: lw, [loser]: ll }, averages: { [winner]: 50, [loser]: 40 } });
    }
  }
}
const lowerSeedWins = (a: string, b: string) => (Number(a.slice(1)) < Number(b.slice(1)) ? a : b);

describe("round robin (Berger table)", () => {
  it("4 players: 3 rounds of 2 games, everyone against everyone exactly once", () => {
    const plan = buildPlan({ format: "round-robin", seeds: players(4) });
    expect(new Set(plan.fixtures.map((f) => f.round))).toEqual(new Set([1, 2, 3]));
    for (const r of [1, 2, 3]) {
      const games = plan.fixtures.filter((f) => f.round === r);
      expect(games).toHaveLength(2);
      expect(new Set(games.flatMap((f) => [f.a, f.b].map((s) => (s.kind === "player" ? s.id : ""))))).toHaveProperty("size", 4);
    }
    const pairs = plan.fixtures.map((f) => pairKey((f.a as { id: string }).id, (f.b as { id: string }).id));
    expect(new Set(pairs).size).toBe(6);
  });

  it("5 players: 5 rounds, one rests each round, everyone plays 4 games", () => {
    const plan = buildPlan({ format: "round-robin", seeds: players(5) });
    expect(Math.max(...plan.fixtures.map((f) => f.round))).toBe(5);
    expect(plan.fixtures).toHaveLength(10);
    for (const p of players(5)) {
      expect(plan.fixtures.filter((f) => [f.a, f.b].some((s) => s.kind === "player" && s.id === p))).toHaveLength(4);
    }
  });

  it("finished when all games are played; the table leader wins", () => {
    const plan = buildPlan({ format: "round-robin", seeds: players(4) });
    const results = playOut(plan, lowerSeedWins);
    expect(results).toHaveLength(6);
    expect(tournamentWinner(plan, results)).toBe("p1");
    expect(tournamentWinner(plan, results.slice(0, 5))).toBeNull();
  });
});

describe("standings", () => {
  const plan = buildPlan({ format: "round-robin", seeds: players(3) });
  const id = (a: string, b: string) =>
    plan.fixtures.find((f) => pairKey((f.a as { id: string }).id, (f.b as { id: string }).id) === pairKey(a, b))!.id;
  const result = (a: string, b: string, winner: string, la: number, lb: number, avg: Record<string, number> = {}): FixtureResult => ({
    fixtureId: id(a, b),
    winner,
    legs: { [a]: la, [b]: lb },
    averages: { [a]: avg[a] ?? 40, [b]: avg[b] ?? 40 },
  });

  it("wins first, then leg difference", () => {
    const rows = standings(plan, [result("p1", "p2", "p1", 2, 1), result("p2", "p3", "p2", 2, 0), result("p1", "p3", "p3", 1, 2)]);
    // all on one win; legs: p1 3:3, p2 3:2 (+1), p3 2:3 (−1)
    expect(rows.map((r) => r.player)).toEqual(["p2", "p1", "p3"]);
    expect(rows[0]).toMatchObject({ played: 2, wins: 1, legsFor: 3, legsAgainst: 2 });
  });

  it("head-to-head when wins and leg difference are equal, then the average", () => {
    const four = buildPlan({ format: "round-robin", seeds: players(4) });
    const res = (a: string, b: string, w: string): FixtureResult => {
      const f = four.fixtures.find((x) => pairKey((x.a as { id: string }).id, (x.b as { id: string }).id) === pairKey(a, b))!;
      const l = w === a ? b : a;
      return { fixtureId: f.id, winner: w, legs: { [w]: 2, [l]: 1 }, averages: { [a]: a === "p4" ? 60 : 40, [b]: b === "p4" ? 60 : 40 } };
    };
    // p1 and p2 both 2 wins with the same legs; p2 beat p1 → p2 ahead
    const rows = standings(four, [
      res("p1", "p2", "p2"),
      res("p1", "p3", "p1"),
      res("p1", "p4", "p1"),
      res("p2", "p3", "p3"),
      res("p2", "p4", "p2"),
      res("p3", "p4", "p4"),
    ]);
    expect(rows.slice(0, 2).map((r) => r.player)).toEqual(["p2", "p1"]);
    // p3 and p4 both 1 win, same legs, the direct game went to p4
    expect(rows.slice(2).map((r) => r.player)).toEqual(["p4", "p3"]);
  });
});

describe("knockout", () => {
  it("6 players: 8 slots, seeds 1 and 2 get a bye in round 1", () => {
    const plan = buildPlan({ format: "knockout", seeds: players(6) });
    const round1 = resolve(plan, []).filter((f) => f.round === 1);
    expect(round1).toHaveLength(4);
    const byes = round1.filter((f) => f.status === "bye");
    expect(byes.map((f) => f.winner).sort()).toEqual(["p1", "p2"]);
    expect(
      round1
        .filter((f) => f.status === "ready")
        .map((f) => pairKey(f.a!, f.b!))
        .sort(),
    ).toEqual(["p3-p6", "p4-p5"]);
  });

  it("the winner moves on, the loser is out; the final decides the tournament", () => {
    const plan = buildPlan({ format: "knockout", seeds: players(6) });
    const results = playOut(plan, lowerSeedWins);
    const resolved = resolve(plan, results);
    const final = resolved.find((f) => f.round === 3)!;
    expect(pairKey(final.a!, final.b!)).toBe("p1-p2");
    expect(tournamentWinner(plan, results)).toBe("p1");
    // a seed-4 player who lost in round 1 is in no later fixture
    expect(resolved.filter((f) => f.round > 1).some((f) => f.a === "p5" || f.b === "p5")).toBe(false);
  });

  it("a later round only opens once both earlier games are decided", () => {
    const plan = buildPlan({ format: "knockout", seeds: players(4) });
    const first = resolve(plan, []).filter((f) => f.status === "ready");
    const one: FixtureResult = { fixtureId: first[0].id, winner: first[0].a!, legs: {}, averages: {} };
    expect(resolve(plan, [one]).find((f) => f.round === 2)!.status).toBe("waiting");
  });
});

describe("groups + knockout", () => {
  it("8 players, 2 groups, 2 advance each: semifinals A1–B2 and B1–A2", () => {
    const plan = buildPlan({ format: "groups-knockout", seeds: players(8), groups: 2, advance: 2 });
    expect(plan.fixtures.filter((f) => f.phase === "group")).toHaveLength(12);
    const results = playOut(plan, lowerSeedWins);
    const semis = resolve(plan, results).filter((f) => f.phase === "knockout" && f.round === 1);
    // snake draw: A = p1 p4 p5 p8, B = p2 p3 p6 p7 → A1 p1, A2 p4, B1 p2, B2 p3
    expect(semis.map((f) => pairKey(f.a!, f.b!)).sort()).toEqual(["p1-p3", "p2-p4"]);
    expect(tournamentWinner(plan, results)).toBe("p1");
  });

  it("9 players, 3 groups, 2 advance each: 6 in an 8 bracket, the two best group winners get a bye", () => {
    const plan = buildPlan({ format: "groups-knockout", seeds: players(9), groups: 3, advance: 2 });
    const results = playOut(plan, lowerSeedWins);
    const ko1 = resolve(plan, results).filter((f) => f.phase === "knockout" && f.round === 1);
    expect(ko1).toHaveLength(4);
    expect(
      ko1
        .filter((f) => f.status === "bye")
        .map((f) => f.winner)
        .sort(),
    ).toEqual(["p1", "p2"]);
  });

  it("the knockout waits until every group is complete", () => {
    const plan = buildPlan({ format: "groups-knockout", seeds: players(8), groups: 2, advance: 2 });
    const groupA = resolve(plan, []).filter((f) => f.group === 1 && f.status === "ready");
    const partial: FixtureResult[] = groupA.map((f) => ({ fixtureId: f.id, winner: f.a!, legs: {}, averages: {} }));
    expect(
      resolve(plan, partial)
        .filter((f) => f.phase === "knockout")
        .every((f) => f.status === "waiting"),
    ).toBe(true);
  });
});

describe("draw", () => {
  it("same random source, same seed list; every player once", () => {
    const rng = () => {
      let s = 1;
      return (n: number) => (s = (s * 48271) % 2147483647) % n;
    };
    const a = draw(players(6), rng());
    expect(a).toEqual(draw(players(6), rng()));
    expect([...a].sort()).toEqual(players(6));
  });
});
