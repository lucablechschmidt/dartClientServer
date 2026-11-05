import type { FinishedMatch } from "@/db/repository";
import { dartLabel, MODE_IDS, visitScore, type ModeId, type PlayerId } from "@/domain/game";
import type { Session } from "@/domain/player";
import { leaderboard, rangeStart, records, type ModeRecord, type StatsMatch, type StatsRange } from "@/domain/stats/aggregate";
import { addFieldHits, fieldHits } from "@/domain/stats/field-hits";
import { x01Stats, type X01Stats } from "@/domain/stats/x01";
import { checkoutOrder } from "@/domain/x01";
import type { Deps } from "./deps";
import { shownName } from "./player-names";

/** M8 statistics (m8-plan): own figures, rankings per mode for everyone, match detail for its players. */

const RECENT = 10;

const toStatsMatch = (m: FinishedMatch): StatsMatch => ({
  id: m.id,
  mode: m.mode,
  finishedAt: m.finishedAt ?? m.startedAt,
  players: m.players.map((p) => p.id),
  placements: m.placements,
  hasGuest: m.players.some((p) => p.guestUntil !== null),
});
const isGuestMatch = (m: FinishedMatch) => m.players.some((p) => p.guestUntil !== null);

export type MyStats = {
  range: StatsRange;
  records: Partial<Record<ModeId, ModeRecord>>;
  x01: X01Stats;
  /** 3-dart average per counted X01 match, oldest first. */
  history: { matchId: string; finishedAt: number; average: number }[];
  /** [field, hits], serializable for the client. */
  fieldHits: [number, number][];
  /** The last games, newest first, guest matches included; `detail` when the match page exists (X01). */
  recent: { id: string; mode: ModeId; names: string[]; finishedAt: number; place: number | null; detail: boolean }[];
};

/** The session's own statistics; nobody sees anybody else's (m8-plan §2). */
export function myStats(deps: Deps, session: Session, range: StatsRange): MyStats {
  const me = session.playerId;
  const mine = deps.matches.listFinishedMatches(rangeStart(range, deps.now())).filter((m) => m.players.some((p) => p.id === me));
  const counted = mine.filter((m) => !isGuestMatch(m));
  const x01 = counted.filter((m) => m.mode === "x01");
  const fromVisits = fieldHits(mine.flatMap((m) => m.state.legs.flatMap((l) => l.visits.filter((v) => v.playerId === me))));
  const hits = range === "all" ? addFieldHits(fromVisits, deps.players.fieldHitsOf(me)) : fromVisits;
  return {
    range,
    records: records(mine.map(toStatsMatch), me),
    x01: x01Stats(
      x01.flatMap((m) => m.state.legs),
      me,
    ),
    history: x01.map((m) => ({ matchId: m.id, finishedAt: m.finishedAt ?? m.startedAt, average: x01Stats(m.state.legs, me).average })),
    fieldHits: [...hits].sort((a, b) => a[0] - b[0]),
    recent: mine
      .slice(-RECENT)
      .reverse()
      .map((m) => ({
        id: m.id,
        mode: m.mode,
        names: m.players.map(shownName),
        finishedAt: m.finishedAt ?? m.startedAt,
        place: m.placements[me] ?? null,
        detail: m.mode === "x01",
      })),
  };
}

export type RankingRow = { player: PlayerId; name: string; place: number; elo: number; games: number; wins: number };
export type ModeRanking = { mode: ModeId; rows: RankingRow[]; own: RankingRow | null };

/** One ranking per mode for everyone (place, name, Elo, games), all time; deleted players are hidden. */
export function leaderboards(deps: Deps, session: Session): ModeRanking[] {
  const finished = deps.matches.listFinishedMatches(null);
  const matches = finished.map(toStatsMatch);
  const players = new Map(finished.flatMap((m) => m.players.map((p) => [p.id, p] as const)));
  const hidden = new Set([...players.values()].filter((p) => p.deletedAt !== null).map((p) => p.id));
  return MODE_IDS.map((mode) => {
    const rows = leaderboard(matches, mode, hidden).map((r) => {
      const p = players.get(r.player);
      return { ...r, elo: Math.round(r.elo), name: p ? shownName(p) : r.player };
    });
    return { mode, rows, own: rows.find((r) => r.player === session.playerId) ?? null };
  });
}

export type DetailVisit = { darts: string[]; points: number; bust: boolean; rest: number };
export type MatchDetail = {
  id: string;
  finishedAt: number | null;
  startScore: number;
  players: { id: PlayerId; name: string }[];
  legs: { setNo: number; legNo: number; winner: PlayerId | null; rows: { player: PlayerId; visits: DetailVisit[]; average: number }[] }[];
};

/** X01 match page (m8-plan §2): every visit per leg and player with the rest after it; only for its players. */
export function matchDetail(
  deps: Deps,
  session: Session,
  matchId: string,
): { ok: true; detail: MatchDetail } | { ok: false; reason: "not-found" | "forbidden" } {
  const m = deps.matches.loadMatch(matchId);
  if (m?.mode !== "x01") return { ok: false, reason: "not-found" };
  if (!m.players.some((p) => p.id === session.playerId)) return { ok: false, reason: "forbidden" };
  const legs = m.state.legs.map((leg, i) => ({
    setNo: m.legs[i]?.setNo ?? 1,
    legNo: m.legs[i]?.legNo ?? i + 1,
    winner: checkoutOrder(leg).at(0) ?? null,
    rows: m.players.map((p) => {
      let rest = leg.rules.startScore;
      const visits = leg.visits
        .filter((v) => v.playerId === p.id)
        .map((v) => {
          const points = visitScore(v);
          rest -= points;
          return { darts: v.darts.map(dartLabel), points, bust: v.isBust, rest };
        });
      return { player: p.id, visits, average: x01Stats([leg], p.id).average };
    }),
  }));
  return {
    ok: true,
    detail: {
      id: m.id,
      finishedAt: m.finishedAt,
      startScore: m.rules.startScore,
      players: m.players.map((p) => ({ id: p.id, name: shownName(p) })),
      legs,
    },
  };
}
