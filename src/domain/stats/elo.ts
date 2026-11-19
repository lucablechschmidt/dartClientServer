import type { ModeId, PlayerId } from "../game/types";
import type { StatsMatch } from "./types";

/**
 * m8-plan §1: every mode has its own Elo. E8 (changed 19.11.2026): matches of two or more players count;
 * a match of n players is a duel of everyone against everyone by place, each worth K/√(n−1).
 */
export const ELO_START = 1000;
export const ELO_K = 32;

/** Chance of a player rated `own` against one rated `other`. */
const expected = (own: number, other: number) => 1 / (1 + 10 ** ((other - own) / 400));

/** Weight of one of the n−1 duels in a match of n players: K for a 1 vs 1, less per duel the more opponents. */
export const eloFactor = (players: number): number => ELO_K / Math.sqrt(players - 1);

/** A player's Elo right after one of their rated matches. */
export type EloPoint = { matchId: string; finishedAt: number; elo: number };

/**
 * Elo of one mode over time: finished matches of that mode with at least two players and without guests,
 * in the order they finished. Every pair of players is a duel: the better place wins, a shared place is a
 * draw; all duels use the ratings from before the match and their changes add up (`eloFactor`). For two
 * players that is the classic Elo. Per player one point after each such match, oldest first; players
 * without such a match have no entry.
 */
export function eloHistory(matches: readonly StatsMatch[], mode: ModeId): Map<PlayerId, EloPoint[]> {
  const ratings = new Map<PlayerId, number>();
  const history = new Map<PlayerId, EloPoint[]>();
  const rated = matches.filter((m) => m.mode === mode && !m.hasGuest && m.players.length >= 2).sort((x, y) => x.finishedAt - y.finishedAt);
  for (const m of rated) {
    const n = m.players.length;
    const before = new Map(m.players.map((p) => [p, ratings.get(p) ?? ELO_START]));
    const place = (p: PlayerId) => m.placements[p] ?? n;
    const factor = eloFactor(n);
    for (const a of m.players) {
      let delta = 0;
      for (const b of m.players) {
        if (a === b) continue;
        const score = place(a) === place(b) ? 0.5 : place(a) < place(b) ? 1 : 0;
        delta += score - expected(before.get(a) ?? ELO_START, before.get(b) ?? ELO_START);
      }
      const elo = (before.get(a) ?? ELO_START) + factor * delta;
      ratings.set(a, elo);
      const points = history.get(a) ?? [];
      points.push({ matchId: m.id, finishedAt: m.finishedAt, elo });
      history.set(a, points);
    }
  }
  return history;
}

/** Current Elo of one mode: the last point of each player's history (`eloHistory`). */
export function eloRatings(matches: readonly StatsMatch[], mode: ModeId): Map<PlayerId, number> {
  return new Map([...eloHistory(matches, mode)].map(([player, points]) => [player, points[points.length - 1].elo]));
}
