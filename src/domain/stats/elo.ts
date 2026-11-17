import type { ModeId, PlayerId } from "../game/types";
import type { StatsMatch } from "./types";

/** m8-plan §1: every mode has its own Elo, from 1-vs-1 matches only (E8). */
export const ELO_START = 1000;
export const ELO_K = 32;

/** Chance of a player rated `own` against one rated `other`. */
const expected = (own: number, other: number) => 1 / (1 + 10 ** ((other - own) / 400));

/** A player's Elo right after one of their rated matches. */
export type EloPoint = { matchId: string; finishedAt: number; elo: number };

/**
 * Elo of one mode over time: finished 1-vs-1 matches of that mode without guests, in the order they
 * finished; a shared place is a draw. Per player one point after each such match, oldest first; players
 * without such a match have no entry.
 */
export function eloHistory(matches: readonly StatsMatch[], mode: ModeId): Map<PlayerId, EloPoint[]> {
  const ratings = new Map<PlayerId, number>();
  const history = new Map<PlayerId, EloPoint[]>();
  const record = (player: PlayerId, m: StatsMatch, elo: number) => {
    ratings.set(player, elo);
    const points = history.get(player) ?? [];
    points.push({ matchId: m.id, finishedAt: m.finishedAt, elo });
    history.set(player, points);
  };
  const duels = matches.filter((m) => m.mode === mode && !m.hasGuest && m.players.length === 2).sort((x, y) => x.finishedAt - y.finishedAt);
  for (const m of duels) {
    const [a, b] = m.players;
    const ra = ratings.get(a) ?? ELO_START;
    const rb = ratings.get(b) ?? ELO_START;
    const pa = m.placements[a] ?? 2;
    const pb = m.placements[b] ?? 2;
    const score = pa === pb ? 0.5 : pa < pb ? 1 : 0;
    const change = ELO_K * (score - expected(ra, rb));
    record(a, m, ra + change);
    record(b, m, rb - change);
  }
  return history;
}

/** Current Elo of one mode: the last point of each player's history (`eloHistory`). */
export function eloRatings(matches: readonly StatsMatch[], mode: ModeId): Map<PlayerId, number> {
  return new Map([...eloHistory(matches, mode)].map(([player, points]) => [player, points[points.length - 1].elo]));
}
