import { matchScore, matchWinner, type MatchState } from "./match";
import { isLegFinished, isOpenVisit, winnerOf } from "./modes";
import { visitScore } from "./scoring";
import type { PlayerId } from "./types";

/** What a finished match contributes to a tournament table (M9): winner, legs won, 3-dart average. */
export type MatchResult = {
  winner: PlayerId | null;
  legs: Record<PlayerId, number>;
  averages: Record<PlayerId, number>;
};

/** One player over all legs of a match (victory screen): legs and sets won, darts, average and highest visit. */
export type PlayerMatchTotals = { legs: number; sets: number; darts: number; average: number; highest: number };

/**
 * Totals per player over every leg played. The average as in legacy: points per closed visit, a bust
 * counts 0 (and as a visit); darts include the overthrown slots of a bust, like the panels.
 */
export function matchTotals(m: MatchState): Record<PlayerId, PlayerMatchTotals> {
  const out: Record<PlayerId, PlayerMatchTotals> = {};
  const points: Record<PlayerId, number> = {};
  const visits: Record<PlayerId, number> = {};
  const { sets } = matchScore(m);
  for (const p of m.players) {
    out[p] = { legs: 0, sets: sets[p], darts: 0, average: 0, highest: 0 };
    points[p] = 0;
    visits[p] = 0;
  }
  for (const leg of m.legs) {
    const winner = isLegFinished(leg) ? winnerOf(leg) : null;
    if (winner) out[winner].legs++;
    leg.visits.forEach((v, i) => {
      const t = out[v.playerId];
      t.darts += v.darts.length;
      if (isOpenVisit(leg, i)) return;
      const score = visitScore(v);
      points[v.playerId] += score;
      visits[v.playerId]++;
      t.highest = Math.max(t.highest, score);
    });
  }
  for (const p of m.players) if (visits[p] > 0) out[p].average = points[p] / visits[p];
  return out;
}

/** Legs won over the whole match (all sets); the average as in `matchTotals`. */
export function matchResult(m: MatchState): MatchResult {
  const totals = matchTotals(m);
  const legs = Object.fromEntries(m.players.map((p) => [p, totals[p].legs]));
  const averages = Object.fromEntries(m.players.map((p) => [p, totals[p].average]));
  return { winner: matchWinner(m), legs, averages };
}
