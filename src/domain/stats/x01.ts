import { visitScore } from "../game/scoring";
import type { LegState, PlayerId } from "../game/types";
import { isOpenVisit, winnerOf } from "../x01/selectors";

/** X01 figures of one player over a set of legs (m8-plan §1). */
export type X01Stats = {
  /** Closed visits; a bust is one with 0 points. */
  visits: number;
  points: number;
  /** 3-dart average as in legacy: points ÷ closed visits. */
  average: number;
  /** The same over the first three visits of each leg. */
  first9: number;
  /** Visits of exactly 180, 140–179, 100–139 (busts never count). */
  count180: number;
  count140: number;
  count100: number;
  /** Highest rest brought to 0 in one visit; null without a checkout. */
  highestFinish: number | null;
  /** Highest visit; null without any visit. */
  highestScore: number | null;
  /** Fewest darts in a won leg, per start score. */
  bestLeg: Record<number, number>;
  legsWon: number;
};

const FIRST_NINE_VISITS = 3;

/**
 * The player's figures from the stored visits. Open visits (a leg cut short by a declared winner)
 * do not count; darts of a busted visit count as thrown, like on the scoreboard.
 */
export function x01Stats(legs: readonly LegState[], player: PlayerId): X01Stats {
  const s: X01Stats = {
    visits: 0,
    points: 0,
    average: 0,
    first9: 0,
    count180: 0,
    count140: 0,
    count100: 0,
    highestFinish: null,
    highestScore: null,
    bestLeg: {},
    legsWon: 0,
  };
  let first9Visits = 0;
  let first9Points = 0;
  for (const leg of legs) {
    if (!leg.players.includes(player)) continue;
    let rest = leg.rules.startScore;
    let ownVisits = 0;
    let darts = 0;
    leg.visits.forEach((v, i) => {
      if (v.playerId !== player || isOpenVisit(leg, i)) return;
      const score = visitScore(v);
      darts += v.darts.length;
      s.visits++;
      s.points += score;
      if (ownVisits++ < FIRST_NINE_VISITS) {
        first9Visits++;
        first9Points += score;
      }
      if (!v.isBust) {
        if (score === 180) s.count180++;
        else if (score >= 140) s.count140++;
        else if (score >= 100) s.count100++;
        s.highestScore = Math.max(s.highestScore ?? 0, score);
        if (score === rest) s.highestFinish = Math.max(s.highestFinish ?? 0, score);
        rest -= score;
      } else {
        s.highestScore ??= 0;
      }
    });
    if (winnerOf(leg) === player) {
      s.legsWon++;
      const start = leg.rules.startScore;
      s.bestLeg[start] = Math.min(s.bestLeg[start] ?? Infinity, darts);
    }
  }
  s.average = s.visits === 0 ? 0 : s.points / s.visits;
  s.first9 = first9Visits === 0 ? 0 : first9Points / first9Visits;
  return s;
}
