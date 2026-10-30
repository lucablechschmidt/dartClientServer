import type { PlayerId } from "../game/types";
import type { FixtureResult, Plan } from "./types";

export type StandingRow = {
  player: PlayerId;
  played: number;
  wins: number;
  losses: number;
  legsFor: number;
  legsAgainst: number;
  /** Mean of the player's match averages. */
  average: number;
};

/** Players of a group, in the order they first appear in its fixtures. */
export function groupPlayers(plan: Plan, group: number): PlayerId[] {
  const out: PlayerId[] = [];
  for (const f of plan.fixtures) {
    if (f.phase !== "group" || f.group !== group) continue;
    for (const s of [f.a, f.b]) if (s.kind === "player" && !out.includes(s.id)) out.push(s.id);
  }
  return out;
}

/**
 * Table of a group (a round robin is group 1): wins, then leg difference, then the direct game
 * (when exactly two are level), then the average (m9-plan §1, §9.2).
 */
export function standings(plan: Plan, results: readonly FixtureResult[], group = 1): StandingRow[] {
  const ids = new Set(plan.fixtures.filter((f) => f.phase === "group" && f.group === group).map((f) => f.id));
  const games = results.filter((r) => ids.has(r.fixtureId));
  const rows = groupPlayers(plan, group).map((player): StandingRow => {
    const own = games.filter((r) => player in r.legs || r.winner === player);
    const legsFor = own.reduce((n, r) => n + (r.legs[player] ?? 0), 0);
    const legsAgainst = own.reduce((n, r) => n + Object.entries(r.legs).reduce((m, [p, l]) => (p === player ? m : m + (l ?? 0)), 0), 0);
    const averages = own.map((r) => r.averages[player]).filter((a): a is number => a !== undefined);
    const wins = own.filter((r) => r.winner === player).length;
    return {
      player,
      played: own.length,
      wins,
      losses: own.length - wins,
      legsFor,
      legsAgainst,
      average: averages.length === 0 ? 0 : averages.reduce((s, a) => s + a, 0) / averages.length,
    };
  });
  const diff = (r: StandingRow) => r.legsFor - r.legsAgainst;
  const directWinner = (a: PlayerId, b: PlayerId) => games.find((r) => a in r.legs && b in r.legs)?.winner;
  return rows.sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (diff(y) !== diff(x)) return diff(y) - diff(x);
    const level = rows.filter((r) => r.wins === x.wins && diff(r) === diff(x));
    if (level.length === 2) {
      const w = directWinner(x.player, y.player);
      if (w === x.player) return -1;
      if (w === y.player) return 1;
    }
    return y.average - x.average;
  });
}
