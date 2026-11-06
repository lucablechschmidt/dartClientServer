import { describe, expect, it } from "vitest";
import {
  buildPlan,
  draw,
  drawKey,
  drawVariants,
  gameCount,
  randomIntFrom,
  redraw,
  resolve,
  standings,
  tournamentWinner,
  withWalkovers,
  type FixtureResult,
  type Plan,
} from ".";

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

describe("walkovers (a deleted player)", () => {
  it("round robin: every open game of the withdrawn player is won by the opponent, played ones stay", () => {
    const plan = buildPlan({ format: "round-robin", seeds: players(3) });
    const first = plan.fixtures.find((f) => [f.a, f.b].some((s) => s.kind === "player" && s.id === "p3"))!;
    const played: FixtureResult = { fixtureId: first.id, winner: "p3", legs: { p3: 2, x: 1 }, averages: {} };
    const results = withWalkovers(plan, [played], new Set(["p3"]));
    expect(results[0]).toBe(played);
    const walkovers = results.slice(1);
    expect(walkovers).toHaveLength(1);
    expect(walkovers[0]).toMatchObject({ walkover: true, averages: {} });
    expect(walkovers[0].winner).not.toBe("p3");
    expect(standings(plan, results).find((r) => r.player === walkovers[0].winner)).toMatchObject({ wins: 1, legsFor: 0 });
  });

  it("knockout: the opponents move on and the final opens without a game played", () => {
    const plan = buildPlan({ format: "knockout", seeds: players(4) });
    const semis = resolve(plan, []).filter((f) => f.round === 1);
    const [gone, stays] = [semis.map((f) => f.a!), semis.map((f) => f.b!)];
    const fixtures = resolve(plan, withWalkovers(plan, [], new Set(gone)));
    expect(fixtures.filter((f) => f.round === 1).map((f) => [f.status, f.winner])).toEqual(stays.map((p) => ["done", p]));
    const final = fixtures.find((f) => f.round === 2)!;
    expect([final.status, [final.a, final.b].sort()]).toEqual(["ready", [...stays].sort()]);
    expect(withWalkovers(plan, [], new Set())).toEqual([]);
  });

  it("both players withdrawn: side A moves on and loses the next game the same way", () => {
    const plan = buildPlan({ format: "knockout", seeds: players(2) });
    const final = resolve(plan, [])[0];
    expect(tournamentWinner(plan, withWalkovers(plan, [], new Set(["p1", "p2"])))).toBe(final.a);
  });
});

describe("gameCount (setup hint)", () => {
  it("games to be played, byes not counted", () => {
    const count = (format: Plan["format"], n: number, groups?: number, advance?: number) =>
      gameCount(buildPlan({ format, seeds: players(n), groups, advance }));
    expect(count("round-robin", 4)).toBe(6);
    expect(count("round-robin", 5)).toBe(10);
    expect(count("knockout", 6)).toBe(5); // 8 bracket, two byes
    expect(count("knockout", 8)).toBe(7);
    expect(count("groups-knockout", 8, 2, 2)).toBe(12 + 3);
    expect(count("groups-knockout", 9, 3, 2)).toBe(9 + 5); // 6 qualifiers in an 8 bracket
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

describe("randomIntFrom (unbiased draw)", () => {
  const bytes = (...values: number[]) => {
    let i = 0;
    return () => {
      const v = values[i++];
      return new Uint8Array([v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]);
    };
  };

  it("draws again for values in the incomplete top block, so % n has no bias", () => {
    // 2^32 % 3 = 1: 0xFFFFFFFF would favour 0, it is rejected and the next value counts.
    expect(randomIntFrom(bytes(0xffffffff, 7))(3)).toBe(1);
    expect(randomIntFrom(bytes(0xfffffffe))(3)).toBe(0xfffffffe % 3);
  });

  it("rejects a range that is not a positive integer", () => {
    expect(() => randomIntFrom(bytes(0))(0)).toThrow(RangeError);
    expect(() => randomIntFrom(bytes(0))(1.5)).toThrow(RangeError);
  });

  it("with crypto bytes every order of four players comes up about equally often", () => {
    const randomInt = randomIntFrom((n) => crypto.getRandomValues(new Uint8Array(n)));
    const counts = new Map<string, number>();
    const rounds = 24_000;
    for (let i = 0; i < rounds; i++) {
      const key = draw(["a", "b", "c", "d"], randomInt).join("");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(24);
    // Expected 1000 each, standard deviation about 31: ±250 is eight of them.
    for (const n of counts.values()) expect(Math.abs(n - rounds / 24)).toBeLessThan(250);
  });
});

describe("redraw (M14): always a different draw", () => {
  const rng = () => {
    let s = 7;
    return (n: number) => (s = (s * 48271) % 2147483647) % n;
  };
  const ko = { format: "knockout" } as const;

  it("the key ignores order: the same pairings listed differently are the same draw", () => {
    expect(drawKey(ko, ["a", "b", "c", "d"])).toBe(drawKey(ko, ["d", "c", "b", "a"]));
    expect(drawKey(ko, ["a", "b", "c", "d"])).not.toBe(drawKey(ko, ["a", "b", "d", "c"])); // a v c, b v d
  });

  it("only one possible draw: none (round robin, one group, a knockout of two)", () => {
    expect(redraw({ format: "round-robin" }, players(5), rng())).toBeNull();
    expect(redraw({ format: "groups-knockout", groups: 1, advance: 2 }, players(6), rng())).toBeNull();
    expect(redraw(ko, players(2), rng())).toBeNull();
    expect(drawVariants(ko, players(2))).toHaveLength(1);
  });

  it("two or three variants: the next one in turn, all of them before the first comes back", () => {
    for (const [input, n] of [
      [ko, 4],
      [ko, 3],
      [{ format: "groups-knockout", groups: 2, advance: 1 }, 4],
    ] as const) {
      expect(drawVariants(input, players(n))).toHaveLength(3);
      let seeds = players(n);
      const keys = [drawKey(input, seeds)];
      for (let i = 0; i < 3; i++) {
        seeds = redraw(input, seeds, rng()) ?? [];
        keys.push(drawKey(input, seeds));
      }
      expect(new Set(keys.slice(0, 3)).size).toBe(3);
      expect(keys[3]).toBe(keys[0]);
    }
  });

  it("more variants: random, but never the current draw", () => {
    const randomInt = rng();
    expect(drawVariants(ko, players(5))).toBeNull();
    let seeds = players(5);
    for (let i = 0; i < 50; i++) {
      const next = redraw(ko, seeds, randomInt) ?? [];
      expect(drawKey(ko, next)).not.toBe(drawKey(ko, seeds));
      expect([...next].sort()).toEqual(players(5));
      seeds = next;
    }
  });
});
