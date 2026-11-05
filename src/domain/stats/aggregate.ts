import type { ModeId, PlayerId } from "../game/types";
import { ELO_START, eloRatings } from "./elo";
import type { StatsMatch, StatsRange } from "./types";

export type { StatsMatch, StatsRange };

const DAY_MS = 24 * 60 * 60 * 1000;

/** First moment a range covers: none for "all", 1 January of `now`'s year, or 30 days back. */
export function rangeStart(range: StatsRange, now: number): number | null {
  if (range === "all") return null;
  if (range === "30d") return now - 30 * DAY_MS;
  return new Date(new Date(now).getFullYear(), 0, 1).getTime();
}

export type ModeRecord = { games: number; wins: number };

const counted = (matches: readonly StatsMatch[]) => matches.filter((m) => !m.hasGuest);

/** Games and wins of a player per mode, guest matches left out. */
export function records(matches: readonly StatsMatch[], player: PlayerId): Partial<Record<ModeId, ModeRecord>> {
  const out: Partial<Record<ModeId, ModeRecord>> = {};
  for (const m of counted(matches)) {
    if (!m.players.includes(player)) continue;
    const r = (out[m.mode] ??= { games: 0, wins: 0 });
    r.games++;
    if (m.placements[player] === 1) r.wins++;
  }
  return out;
}

export type LeaderboardRow = { player: PlayerId; place: number; elo: number; games: number; wins: number };

/**
 * Ranking of one mode: everyone with a counted match of it, by Elo (1000 without a 1-vs-1 match),
 * then by games; equal rounded Elo and games share the place. `hidden` players (deleted) are left
 * out, though their matches still count for the others' Elo.
 */
export function leaderboard(matches: readonly StatsMatch[], mode: ModeId, hidden: ReadonlySet<PlayerId>): LeaderboardRow[] {
  const ofMode = counted(matches).filter((m) => m.mode === mode);
  const elo = eloRatings(ofMode, mode);
  const players = [...new Set(ofMode.flatMap((m) => m.players))].filter((p) => !hidden.has(p));
  const rows = players.map((player) => {
    const r = records(ofMode, player)[mode] ?? { games: 0, wins: 0 };
    return { player, place: 0, elo: elo.get(player) ?? ELO_START, games: r.games, wins: r.wins };
  });
  rows.sort((x, y) => y.elo - x.elo || y.games - x.games);
  const key = (r: LeaderboardRow) => `${Math.round(r.elo)}/${r.games}`;
  rows.forEach((r, i) => (r.place = i > 0 && key(rows[i - 1]) === key(r) ? rows[i - 1].place : i + 1));
  return rows;
}
