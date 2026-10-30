import { matchWinner, type MatchState } from "./match";
import { isLegFinished, isOpenVisit, winnerOf } from "./modes";
import { visitScore } from "./scoring";
import type { PlayerId } from "./types";

/** What a finished match contributes to a tournament table (M9): winner, legs won, 3-dart average. */
export type MatchResult = {
  winner: PlayerId | null;
  legs: Record<PlayerId, number>;
  averages: Record<PlayerId, number>;
};

/** Legs won over the whole match (all sets); the average as in legacy: points per closed visit, a bust counts 0. */
export function matchResult(m: MatchState): MatchResult {
  const legs: Record<PlayerId, number> = Object.fromEntries(m.players.map((p) => [p, 0]));
  const points: Record<PlayerId, number> = { ...legs };
  const visits: Record<PlayerId, number> = { ...legs };
  for (const leg of m.legs) {
    const winner = isLegFinished(leg) ? winnerOf(leg) : null;
    if (winner) legs[winner] = (legs[winner] ?? 0) + 1;
    leg.visits.forEach((v, i) => {
      if (isOpenVisit(leg, i)) return;
      points[v.playerId] = (points[v.playerId] ?? 0) + visitScore(v);
      visits[v.playerId] = (visits[v.playerId] ?? 0) + 1;
    });
  }
  const averages = Object.fromEntries(m.players.map((p) => [p, visits[p] ? (points[p] ?? 0) / visits[p] : 0]));
  return { winner: matchWinner(m), legs, averages };
}
