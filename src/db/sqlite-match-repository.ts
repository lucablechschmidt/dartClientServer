import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, lte, max, ne, or, sql } from "drizzle-orm";
import { replayMatch, type PlayerId, type Visit } from "@/domain/game";
import type { Db } from "./client";
import type {
  ExpiredGuestMatch,
  LoadedMatch,
  MatchRepository,
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
        .where(and(eq(matchPlayers.matchId, id), isNull(players.guestUntil)))
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
      return { id, regularPlayerIds, visits: rows.map(rowToVisit) };
    });
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
  listRecentMatches(openSince: number, limit: number): RecentMatch[] {
    return this.db
      .select()
      .from(matches)
      .where(or(ne(matches.status, "running"), lte(matches.startedAt, openSince)))
      .orderBy(desc(sql`coalesce(${matches.finishedAt}, ${matches.startedAt})`))
      .limit(limit)
      .all()
      .map((m) => {
        const seats = this.db.select().from(matchPlayers).where(eq(matchPlayers.matchId, m.id)).all();
        const winners = this.db
          .select({ winner: legs.winnerPlayerId })
          .from(legs)
          .where(eq(legs.matchId, m.id))
          .orderBy(asc(legs.setNo), asc(legs.legNo))
          .all();
        return {
          id: m.id,
          mode: m.mode,
          players: this.seatedPlayers(m.id),
          status: m.status,
          startedAt: m.startedAt,
          finishedAt: m.finishedAt,
          format: { legsToWinSet: m.legsToWinSet, setsToWinMatch: m.setsToWinMatch },
          legWinners: winners.map((w) => w.winner),
          placements: Object.fromEntries(seats.map((s) => [s.playerId, s.placement])),
        };
      });
  }
  loadMatch(matchId: string): LoadedMatch | null {
    const match = this.db.select().from(matches).where(eq(matches.id, matchId)).get();
    if (!match) return null;
    const seated = this.seatedPlayers(matchId);
    const legRows = this.db.select().from(legs).where(eq(legs.matchId, matchId)).orderBy(asc(legs.setNo), asc(legs.legNo)).all();
    if (legRows.length === 0) return null;
    const visitRows = this.db
      .select()
      .from(visits)
      .where(
        inArray(
          visits.legId,
          legRows.map((l) => l.id),
        ),
      )
      .orderBy(asc(visits.seq))
      .all();
    const rules = { startScore: match.startScore, inRule: match.inRule, outRule: match.outRule };
    const format = { legsToWinSet: match.legsToWinSet, setsToWinMatch: match.setsToWinMatch };
    const playerIds = seated.map((p) => p.id);
    const stored = legRows.map((l) => ({
      starter: Math.max(0, playerIds.indexOf(l.starterPlayerId)),
      visits: visitRows.filter((v) => v.legId === l.id).map(rowToVisit),
      playOut: l.playOut,
    }));
    return {
      id: match.id,
      mode: match.mode,
      rules,
      status: match.status,
      players: seated,
      inputMode: match.inputMode,
      hostPlayerId: match.hostPlayerId,
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
      format,
      legs: legRows.map((l) => ({ id: l.id, setNo: l.setNo, legNo: l.legNo, winnerPlayerId: l.winnerPlayerId })),
      state: replayMatch(playerIds, rules, format, stored, 0, match.mode),
    };
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
