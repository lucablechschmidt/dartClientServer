import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, lte, max } from "drizzle-orm";
import { replay, type PlayerId, type Visit } from "@/domain/x01";
import type { Db } from "./client";
import type { ExpiredGuestMatch, LoadedMatch, MatchRepository, MatchStatus, NewMatch, OpenMatch, Player } from "./repository";
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
      const legIds = this.db.select({ id: legs.id }).from(legs).where(eq(legs.matchId, id)).all().map((r) => r.id);
      const rows = legIds.length ? this.db.select().from(visits).where(inArray(visits.legId, legIds)).orderBy(asc(visits.legId), asc(visits.seq)).all() : [];
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
          mode: "x01",
          startScore: input.rules.startScore,
          inRule: input.rules.inRule,
          outRule: input.rules.outRule,
          inputMode: input.inputMode,
          hostPlayerId: input.hostPlayerId,
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
      .map((m) => ({ id: m.id, players: this.seatedPlayers(m.id), inputMode: m.inputMode, startedAt: m.startedAt }));
  }
  loadMatch(matchId: string): LoadedMatch | null {
    const match = this.db.select().from(matches).where(eq(matches.id, matchId)).get();
    if (!match) return null;
    const seated = this.seatedPlayers(matchId);
    const leg = this.db
      .select()
      .from(legs)
      .where(eq(legs.matchId, matchId))
      .orderBy(asc(legs.setNo), asc(legs.legNo))
      .all()
      .at(-1);
    if (!leg) return null;
    const rows = this.db.select().from(visits).where(eq(visits.legId, leg.id)).orderBy(asc(visits.seq)).all();
    const rules = { startScore: match.startScore, inRule: match.inRule, outRule: match.outRule };
    const playerIds = seated.map((p) => p.id);
    const starter = Math.max(0, playerIds.indexOf(leg.starterPlayerId));
    return {
      id: match.id,
      rules,
      status: match.status,
      players: seated,
      inputMode: match.inputMode,
      hostPlayerId: match.hostPlayerId,
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
      leg: { id: leg.id, setNo: leg.setNo, legNo: leg.legNo, winnerPlayerId: leg.winnerPlayerId },
      state: replay(playerIds, rules, rows.map(rowToVisit), starter),
    };
  }
  syncVisits(legId: string, all: Visit[], fromSeq: number, ids: () => string, now: number): void {
    this.db.transaction((tx) => {
      tx.delete(visits).where(and(eq(visits.legId, legId), gte(visits.seq, fromSeq))).run();
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
}
