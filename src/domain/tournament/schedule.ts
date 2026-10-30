import type { PlayerId } from "../game/types";
import type { Fixture, Plan, Source, TournamentFormat } from "./types";

/** Fisher–Yates with an injected random source (`randomInt(n)` in [0, n)), so the draw is testable. */
export function draw<T>(items: readonly T[], randomInt: (n: number) => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const player = (id: PlayerId): Source => ({ kind: "player", id });

/**
 * Round robin by the Berger table (circle method): n−1 rounds for even n, n rounds with one player
 * resting per round for odd n; everyone meets everyone exactly once. Replaces the legacy generator
 * (Tournament.swift), which assigned shuffled pairings greedily and could leave games unscheduled.
 */
export function roundRobin(players: readonly PlayerId[], group = 1): Fixture[] {
  const circle: (PlayerId | null)[] = players.length % 2 === 0 ? [...players] : [...players, null];
  const n = circle.length;
  const fixtures: Fixture[] = [];
  for (let round = 1; round < n; round++) {
    let slot = 0;
    for (let i = 0; i < n / 2; i++) {
      const a = circle[i];
      const b = circle[n - 1 - i];
      if (a != null && b != null) {
        slot++;
        fixtures.push({ id: `g${group}-r${round}-s${slot}`, phase: "group", group, round, slot, a: player(a), b: player(b) });
      }
    }
    circle.splice(1, 0, circle.pop() ?? null); // keep the first, rotate the rest
  }
  return fixtures;
}

/** Seed positions of a bracket: 1 v 8, 4 v 5, 2 v 7, 3 v 6 for eight, so the best meet last. */
function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const m = order.length * 2;
    order = order.flatMap((s) => [s, m + 1 - s]);
  }
  return order;
}

/** Knockout over entrants in seed order; the bracket is the next power of two, the best seeds get the byes. */
export function knockout(entrants: readonly Source[]): Fixture[] {
  let size = 1;
  while (size < entrants.length) size *= 2;
  const order = seedOrder(size);
  const fixtures: Fixture[] = [];
  const at = (seed: number): Source => entrants.at(seed - 1) ?? { kind: "bye" };
  let previous: Fixture[] = [];
  for (let round = 1, games = size / 2; games >= 1; round++, games /= 2) {
    const current: Fixture[] = [];
    for (let slot = 1; slot <= games; slot++) {
      const [a, b]: Source[] =
        round === 1
          ? [at(order[2 * slot - 2]), at(order[2 * slot - 1])]
          : [
              { kind: "winner", fixture: previous[2 * slot - 2].id },
              { kind: "winner", fixture: previous[2 * slot - 1].id },
            ];
      current.push({ id: `k-r${round}-s${slot}`, phase: "knockout", group: null, round, slot, a, b });
    }
    fixtures.push(...current);
    previous = current;
  }
  return fixtures;
}

/** Snake draw into groups (A B C C B A …), so every group gets a fair share of the seeds. */
export function splitIntoGroups(seeds: readonly PlayerId[], groups: number): PlayerId[][] {
  const out: PlayerId[][] = Array.from({ length: groups }, () => []);
  seeds.forEach((p, i) => {
    const lap = Math.floor(i / groups);
    const g = lap % 2 === 0 ? i % groups : groups - 1 - (i % groups);
    out[g].push(p);
  });
  return out;
}

export type PlanInput = { format: TournamentFormat; seeds: readonly PlayerId[]; groups?: number; advance?: number };

/**
 * The whole schedule from the seed list. Groups + knockout: the qualifiers enter the knockout in the
 * order all group winners, then all runners-up …, so with two groups the semifinals are A1–B2 and B1–A2.
 */
export function buildPlan({ format, seeds, groups = 1, advance = 2 }: PlanInput): Plan {
  if (format === "round-robin") return { format, fixtures: roundRobin(seeds) };
  if (format === "knockout") return { format, fixtures: knockout(seeds.map(player)) };
  const split = splitIntoGroups(seeds, groups);
  const groupFixtures = split.flatMap((members, i) => roundRobin(members, i + 1));
  const qualifiers: Source[] = [];
  for (let place = 1; place <= advance; place++) {
    split.forEach((members, i) => {
      if (members.length >= place) qualifiers.push({ kind: "group", group: i + 1, place });
    });
  }
  return { format, fixtures: [...groupFixtures, ...knockout(qualifiers)] };
}
