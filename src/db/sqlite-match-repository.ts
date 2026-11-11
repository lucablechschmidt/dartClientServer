import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lte, max, ne, or, sql } from "drizzle-orm";
import { replayMatch, type ModeId, type PlayerId, type Visit } from "@/domain/game";
import type { Db } from "./client";
import type {
  ExpiredGuestMatch,
  FinishedMatch,
  LoadedMatch,
  MatchRepository,
  MatchSummary,
  MatchStatus,
  NewLeg,
  NewMatch,
  OpenMatch,
  Player,
  RecentMatch,
} from "./repository";
import { legs, matchPlayers, matches, players, visits } from "./schema";
import { toPlayer } from "./sqlite-player-repository";
import { rowToVisit, visitToSlots } from "./visit-mapping";

type MatchRow = typeof matches.$inferSelect;

/** SQLite allows 32766 variables per statement; 500 ids per IN keeps statements small. */
const CHUNK = 500;
const chunked = <T>(xs: readonly T[]): T[][] =>
  Array.from({ length: Math.ceil(xs.length / CHUNK) }, (_, i) => xs.slice(i * CHUNK, (i + 1) * CHUNK));

function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    const list = out.get(k);
    if (list) list.push(x);
    else out.set(k, [x]);
  }
  return out;
}

/** Matches, legs and visits (SQLite). */
export class SqliteMatchRepository implements MatchRepository {
  constructor(private readonly db: Db) {}

  listExpiredGuestMatches(now: number): ExpiredGuestMatch[] {
    const expired = this.db
      .select({ matchId: matchPlayers.matchId })
      .from(matchPlayers)
      .innerJoin(players, eq(players.id, matchPlayers.playerId))
      .where(isNotNull(players.guestUntil))
      .groupBy(matchPlayers.matchId)
      .having(lte(max(players.guestUntil), now))
      .all()
      .map((r) => r.matchId);
    return expired.map((id) => {
      const regularPlayerIds = this.db
        .select({ id: players.id })
        .from(matchPlayers)
        .innerJoin(players, eq(players.id, matchPlayers.playerId))
        .where(and(eq(matchPlayers.matchId, id), isNull(players.guestUntil), isNull(players.deletedAt)))
        .all()
        .map((r) => r.id);
      const legIds = this.db
        .select({ id: legs.id })
        .from(legs)
        .where(eq(legs.matchId, id))
        .all()
        .map((r) => r.id);
      const rows = legIds.length
        ? this.db.select().from(visits).where(inArray(visits.legId, legIds)).orderBy(asc(visits.legId), asc(visits.seq)).all()
        : [];
      const m = this.finishedById(id);
      const finished = m ? { mode: m.mode, state: m.state, placements: m.placements, finishedAt: m.finishedAt ?? m.startedAt } : null;
      const status = this.db.select({ status: matches.status }).from(matches).where(eq(matches.id, id)).get()?.status;
      return { id, regularPlayerIds, visits: rows.map(rowToVisit), finished, abandoned: status === "abandoned" };
    });
  }
  listAbandonedMatchIds(startedBefore: number): string[] {
    return this.db
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.status, "abandoned"), lte(matches.startedAt, startedBefore)))
      .all()
      .map((r) => r.id);
  }
  deleteMatch(matchId: string): void {
    this.db.delete(matches).where(eq(matches.id, matchId)).run(); // match_player, leg, visit: ON DELETE CASCADE
  }
  createMatch(input: NewMatch): void {
    this.db.transaction((tx) => {
      tx.insert(matches)
        .values({
          id: input.id,
          mode: input.mode,
          startScore: input.rules.startScore,
          inRule: input.rules.inRule,
          outRule: input.rules.outRule,
          inputMode: input.inputMode,
          hostPlayerId: input.hostPlayerId,
          isTournament: input.isTournament ?? false,
          legsToWinSet: input.format.legsToWinSet,
          setsToWinMatch: input.format.setsToWinMatch,
          startedAt: input.startedAt,
        })
        .run();
      tx.insert(matchPlayers)
        .values(input.playerIds.map((playerId, seat) => ({ matchId: input.id, playerId, seat })))
        .run();
      tx.insert(legs)
        .values({
          id: input.legId,
          matchId: input.id,
          starterPlayerId: input.playerIds[input.starterIndex],
        })
        .run();
    });
  }
  private seatedPlayers(matchId: string): Player[] {
    return this.db
      .select({ player: players, seat: matchPlayers.seat })
      .from(matchPlayers)
      .innerJoin(players, eq(players.id, matchPlayers.playerId))
      .where(eq(matchPlayers.matchId, matchId))
      .orderBy(asc(matchPlayers.seat))
      .all()
      .map((r) => toPlayer(r.player));
  }
  listOpenMatches(openSince: number): OpenMatch[] {
    return this.db
      .select()
      .from(matches)
      .where(and(eq(matches.status, "running"), gt(matches.startedAt, openSince)))
      .orderBy(desc(matches.startedAt))
      .all()
      .map((m) => ({ id: m.id, mode: m.mode, players: this.seatedPlayers(m.id), inputMode: m.inputMode, startedAt: m.startedAt }));
  }
  listFinishedMatches(since: number | null, playerIds?: readonly PlayerId[]): FinishedMatch[] {
    const seatedAny =
      playerIds === undefined
        ? undefined
        : inArray(
            matches.id,
            this.db
              .select({ id: matchPlayers.matchId })
              .from(matchPlayers)
              .where(inArray(matchPlayers.playerId, [...playerIds])),
          );
    const rows = this.db
      .select()
      .from(matches)
      .where(and(eq(matches.status, "finished"), since === null ? undefined : gte(matches.finishedAt, since), seatedAny))
      .orderBy(asc(matches.finishedAt))
      .all();
    return this.hydrate(rows).map(({ match, placements }) => ({ ...match, placements }));
  }
  loadMatches(matchIds: readonly string[]): LoadedMatch[] {
    const rows = chunked(matchIds).flatMap((ids) => this.db.select().from(matches).where(inArray(matches.id, ids)).all());
    return this.hydrate(rows).map(({ match }) => match);
  }
  /** A finished match with its places; null for any other status. */
  private finishedById(id: string): FinishedMatch | null {
    const row = this.db.select().from(matches).where(eq(matches.id, id)).get();
    if (row?.status !== "finished") return null;
    const loaded = this.hydrate([row]).at(0);
    return loaded ? { ...loaded.match, placements: loaded.placements } : null;
  }
  /**
   * R-01 (m13-plan.md): seats, legs and visits of many matches in one select per table (in chunks of
   * CHUNK ids for SQLite's variable limit), grouped in JS, then replayed; the order of `rows` is kept.
   * A match without legs is left out, as in loadMatch.
   */
  private hydrate(rows: MatchRow[]): { match: LoadedMatch; placements: Record<PlayerId, number | null> }[] {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const seats = groupBy(
      chunked(ids).flatMap((c) =>
        this.db
          .select({ player: players, matchId: matchPlayers.matchId, placement: matchPlayers.placement })
          .from(matchPlayers)
          .innerJoin(players, eq(players.id, matchPlayers.playerId))
          .where(inArray(matchPlayers.matchId, c))
          .orderBy(asc(matchPlayers.matchId), asc(matchPlayers.seat))
          .all(),
      ),
      (r) => r.matchId,
    );
    const legRows = groupBy(
      chunked(ids).flatMap((c) =>
        this.db.select().from(legs).where(inArray(legs.matchId, c)).orderBy(asc(legs.matchId), asc(legs.setNo), asc(legs.legNo)).all(),
      ),
      (l) => l.matchId,
    );
    const visitRows = groupBy(
      chunked(ids).flatMap((c) =>
        this.db
          .select({ visit: visits })
          .from(visits)
          .innerJoin(legs, eq(legs.id, visits.legId))
          .where(inArray(legs.matchId, c))
          .orderBy(asc(visits.legId), asc(visits.seq))
          .all()
          .map((r) => r.visit),
      ),
      (v) => v.legId,
    );
    return rows.flatMap((match) => {
      const legsOf = legRows.get(match.id) ?? [];
      if (legsOf.length === 0) return [];
      const seated = seats.get(match.id) ?? [];
      const playerIds = seated.map((r) => r.player.id);
      const rules = { startScore: match.startScore, inRule: match.inRule, outRule: match.outRule };
      const format = { legsToWinSet: match.legsToWinSet, setsToWinMatch: match.setsToWinMatch };
      const stored = legsOf.map((l) => ({
        starter: Math.max(0, playerIds.indexOf(l.starterPlayerId)),
        visits: (visitRows.get(l.id) ?? []).map(rowToVisit),
        playOut: l.playOut,
      }));
      const loaded: LoadedMatch = {
        id: match.id,
        mode: match.mode,
        rules,
        status: match.status,
        players: seated.map((r) => toPlayer(r.player)),
        inputMode: match.inputMode,
        hostPlayerId: match.hostPlayerId,
        startedAt: match.startedAt,
        finishedAt: match.finishedAt,
        isTournament: match.isTournament,
        format,
        legs: legsOf.map((l) => ({ id: l.id, setNo: l.setNo, legNo: l.legNo, winnerPlayerId: l.winnerPlayerId })),
        state: replayMatch(playerIds, rules, format, stored, 0, match.mode, match.decidedWinnerId),
      };
      return [{ match: loaded, placements: Object.fromEntries(seated.map((r) => [r.player.id, r.placement])) }];
    });
  }
  listMatches(limit: number, offset: number): MatchSummary[] {
    return this.db
      .select()
      .from(matches)
      .orderBy(desc(matches.startedAt))
      .limit(limit)
      .offset(offset)
      .all()
      .map((m) => ({
        id: m.id,
        mode: m.mode,
        rules: { startScore: m.startScore, inRule: m.inRule, outRule: m.outRule },
        status: m.status,
        players: this.seatedPlayers(m.id),
        inputMode: m.inputMode,
        hostPlayerId: m.hostPlayerId,
        startedAt: m.startedAt,
        finishedAt: m.finishedAt,
        isTournament: m.isTournament,
      }));
  }
  listOpenMatchIdsOf(playerId: PlayerId): string[] {
    const seated = this.db.select({ id: matchPlayers.matchId }).from(matchPlayers).where(eq(matchPlayers.playerId, playerId));
    return this.db
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.status, "running"), or(eq(matches.hostPlayerId, playerId), inArray(matches.id, seated))))
      .all()
      .map((r) => r.id);
  }
  private recentWhere(openSince: number, mode?: ModeId) {
    return and(
      or(ne(matches.status, "running"), lte(matches.startedAt, openSince)),
      mode === undefined ? undefined : eq(matches.mode, mode),
    );
  }
  countRecentMatches(openSince: number, mode?: ModeId): number {
    return this.db.select({ n: count() }).from(matches).where(this.recentWhere(openSince, mode)).get()?.n ?? 0;
  }
  /** History (M5, `/history`): one select for the matches, one for all seats, one for all leg winners (R-01). */
  listRecentMatches(openSince: number, limit: number, mode?: ModeId): RecentMatch[] {
    const rows = this.db
      .select()
      .from(matches)
      .where(this.recentWhere(openSince, mode))
      .orderBy(desc(sql`coalesce(${matches.finishedAt}, ${matches.startedAt})`))
      .limit(limit)
      .all();
    const ids = rows.map((m) => m.id);
    const seats = groupBy(
      chunked(ids).flatMap((c) =>
        this.db
          .select({ player: players, matchId: matchPlayers.matchId, placement: matchPlayers.placement })
          .from(matchPlayers)
          .innerJoin(players, eq(players.id, matchPlayers.playerId))
          .where(inArray(matchPlayers.matchId, c))
          .orderBy(asc(matchPlayers.matchId), asc(matchPlayers.seat))
          .all(),
      ),
      (r) => r.matchId,
    );
    const winners = groupBy(
      chunked(ids).flatMap((c) =>
        this.db
          .select({ matchId: legs.matchId, winner: legs.winnerPlayerId })
          .from(legs)
          .where(inArray(legs.matchId, c))
          .orderBy(asc(legs.matchId), asc(legs.setNo), asc(legs.legNo))
          .all(),
      ),
      (l) => l.matchId,
    );
    return rows.map((m) => {
      const seated = seats.get(m.id) ?? [];
      return {
        id: m.id,
        mode: m.mode,
        rules: { startScore: m.startScore, inRule: m.inRule, outRule: m.outRule },
        players: seated.map((r) => toPlayer(r.player)),
        status: m.status,
        startedAt: m.startedAt,
        finishedAt: m.finishedAt,
        format: { legsToWinSet: m.legsToWinSet, setsToWinMatch: m.setsToWinMatch },
        legWinners: (winners.get(m.id) ?? []).map((w) => w.winner),
        placements: Object.fromEntries(seated.map((r) => [r.player.id, r.placement])),
      };
    });
  }
  loadMatch(matchId: string): LoadedMatch | null {
    const row = this.db.select().from(matches).where(eq(matches.id, matchId)).get();
    return row ? (this.hydrate([row]).at(0)?.match ?? null) : null;
  }
  syncVisits(legId: string, all: Visit[], fromSeq: number, ids: () => string, now: number): void {
    this.db.transaction((tx) => {
      tx.delete(visits)
        .where(and(eq(visits.legId, legId), gte(visits.seq, fromSeq)))
        .run();
      const rows = all.slice(fromSeq).map((v, i) => ({
        id: ids(),
        legId,
        playerId: v.playerId,
        seq: fromSeq + i,
        createdAt: now,
        ...visitToSlots(v),
      }));
      if (rows.length > 0) tx.insert(visits).values(rows).run();
    });
  }
  finishLeg(legId: string, winnerPlayerId: PlayerId, now: number): void {
    this.db.update(legs).set({ winnerPlayerId, finishedAt: now }).where(eq(legs.id, legId)).run();
  }
  reopenLeg(legId: string): void {
    this.db.update(legs).set({ winnerPlayerId: null, finishedAt: null }).where(eq(legs.id, legId)).run();
  }
  setMatchStatus(matchId: string, status: MatchStatus, now: number): void {
    this.db
      .update(matches)
      .set({ status, finishedAt: status === "running" ? null : now })
      .where(eq(matches.id, matchId))
      .run();
  }
  setDecidedWinner(matchId: string, playerId: PlayerId | null): void {
    this.db.update(matches).set({ decidedWinnerId: playerId }).where(eq(matches.id, matchId)).run();
  }
  createLeg(leg: NewLeg): void {
    this.db.insert(legs).values(leg).run();
  }
  deleteLeg(legId: string): void {
    this.db.delete(legs).where(eq(legs.id, legId)).run(); // visits: ON DELETE CASCADE
  }
  setLegStarter(legId: string, starterPlayerId: PlayerId): void {
    this.db.update(legs).set({ starterPlayerId }).where(eq(legs.id, legId)).run();
  }
  setPlayOut(legId: string, playOut: boolean): void {
    this.db.update(legs).set({ playOut }).where(eq(legs.id, legId)).run();
  }
  setPlacements(matchId: string, placements: Record<PlayerId, number | null>): void {
    this.db.transaction((tx) => {
      for (const [playerId, placement] of Object.entries(placements)) {
        tx.update(matchPlayers)
          .set({ placement })
          .where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.playerId, playerId)))
          .run();
      }
    });
  }
}
