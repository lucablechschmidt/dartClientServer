import type { PlayerId } from "../game/types";
import { standings } from "./standings";
import type { FixtureResult, Plan, ResolvedFixture, Source } from "./types";

/** A side that is a bye; a symbol, because a player id is any string. */
const BYE = Symbol("bye");
type Side = PlayerId | null | typeof BYE;

/**
 * Who plays in which fixture, given the results so far. A side is known once its source is: a
 * player directly, the winner of a decided fixture, or a group place once the whole group is played.
 * A fixture against a bye is decided without a match.
 */
export function resolve(plan: Plan, results: readonly FixtureResult[]): ResolvedFixture[] {
  const byId = new Map(results.map((r) => [r.fixtureId, r]));
  const resolved = new Map<string, ResolvedFixture>();
  const groupDone = (group: number) => plan.fixtures.filter((f) => f.phase === "group" && f.group === group).every((f) => byId.has(f.id));

  const side = (s: Source): Side => {
    switch (s.kind) {
      case "player":
        return s.id;
      case "bye":
        return BYE;
      case "winner":
        return resolved.get(s.fixture)?.winner ?? null;
      case "group":
        return groupDone(s.group) ? (standings(plan, results, s.group).at(s.place - 1)?.player ?? BYE) : null;
    }
  };

  for (const f of plan.fixtures) {
    const a = side(f.a);
    const b = side(f.b);
    const result = byId.get(f.id);
    const known = (x: Side): PlayerId | null => (x === BYE ? null : x);
    let status: ResolvedFixture["status"];
    let winner: PlayerId | null = null;
    if (a === BYE || b === BYE) {
      const other = a === BYE ? b : a;
      status = other === null ? "waiting" : "bye";
      winner = known(other);
    } else if (result) {
      status = "done";
      winner = result.winner;
    } else {
      status = a !== null && b !== null ? "ready" : "waiting";
    }
    resolved.set(f.id, { ...f, a: known(a), b: known(b), status, winner });
  }
  return plan.fixtures.map((f) => resolved.get(f.id)).filter((f): f is ResolvedFixture => f !== undefined);
}

/** Round robin: the table leader once every game is played; otherwise the winner of the final. */
export function tournamentWinner(plan: Plan, results: readonly FixtureResult[]): PlayerId | null {
  const fixtures = resolve(plan, results);
  if (plan.format === "round-robin") {
    return fixtures.every((f) => f.status === "done") ? (standings(plan, results).at(0)?.player ?? null) : null;
  }
  const knockout = fixtures.filter((f) => f.phase === "knockout");
  const lastRound = Math.max(...knockout.map((f) => f.round));
  return knockout.find((f) => f.round === lastRound)?.winner ?? null;
}
