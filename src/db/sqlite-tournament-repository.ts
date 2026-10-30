import { and, asc, desc, eq } from "drizzle-orm";
import type { PlayerId } from "@/domain/game";
import type { Db } from "./client";
import { players, tournamentMatches, tournamentPlayers, tournamentRoundFormats, tournaments } from "./schema";
import { toPlayer } from "./sqlite-player-repository";
import type { NewTournament, StoredTournament, TournamentRepository } from "./tournament-repository";

export class SqliteTournamentRepository implements TournamentRepository {
  constructor(private readonly db: Db) {}

  createTournament(t: NewTournament): void {
    this.db.transaction((tx) => {
      tx.insert(tournaments)
        .values({
          id: t.id,
          name: t.name,
          format: t.format,
          groupCount: t.groupCount,
          advancePerGroup: t.advancePerGroup,
          startScore: t.rules.startScore,
          inRule: t.rules.inRule,
          outRule: t.rules.outRule,
          inputMode: t.inputMode,
          createdBy: t.createdBy,
          createdAt: t.createdAt,
        })
        .run();
      tx.insert(tournamentPlayers)
        .values(t.seeds.map((playerId, i) => ({ tournamentId: t.id, playerId, seed: i + 1 })))
        .run();
      if (t.roundFormats.length > 0)
        tx.insert(tournamentRoundFormats)
          .values(t.roundFormats.map((f) => ({ tournamentId: t.id, ...f })))
          .run();
    });
  }
  listTournaments(): StoredTournament[] {
    return this.db
      .select({ id: tournaments.id })
      .from(tournaments)
      .orderBy(desc(tournaments.createdAt))
      .all()
      .flatMap((r) => {
        const t = this.loadTournament(r.id);
        return t ? [t] : [];
      });
  }
  loadTournament(id: string): StoredTournament | null {
    const t = this.db.select().from(tournaments).where(eq(tournaments.id, id)).get();
    if (!t) return null;
    const seeds = this.db
      .select({ player: players })
      .from(tournamentPlayers)
      .innerJoin(players, eq(players.id, tournamentPlayers.playerId))
      .where(eq(tournamentPlayers.tournamentId, id))
      .orderBy(asc(tournamentPlayers.seed))
      .all()
      .map((r) => toPlayer(r.player));
    const roundFormats = this.db
      .select({
        phase: tournamentRoundFormats.phase,
        round: tournamentRoundFormats.round,
        legsToWinSet: tournamentRoundFormats.legsToWinSet,
        setsToWinMatch: tournamentRoundFormats.setsToWinMatch,
      })
      .from(tournamentRoundFormats)
      .where(eq(tournamentRoundFormats.tournamentId, id))
      .all();
    const links = this.db
      .select({ fixtureId: tournamentMatches.fixtureId, matchId: tournamentMatches.matchId })
      .from(tournamentMatches)
      .where(eq(tournamentMatches.tournamentId, id))
      .all();
    return {
      id: t.id,
      name: t.name,
      format: t.format,
      groupCount: t.groupCount,
      advancePerGroup: t.advancePerGroup,
      rules: { startScore: t.startScore, inRule: t.inRule, outRule: t.outRule },
      inputMode: t.inputMode,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
      seeds,
      roundFormats,
      links,
    };
  }
  setSeeds(id: string, seeds: PlayerId[]): void {
    this.db.transaction((tx) => {
      seeds.forEach((playerId, i) => {
        tx.update(tournamentPlayers)
          .set({ seed: i + 1 })
          .where(and(eq(tournamentPlayers.tournamentId, id), eq(tournamentPlayers.playerId, playerId)))
          .run();
      });
    });
  }
  linkMatch(id: string, fixtureId: string, matchId: string): void {
    this.db
      .insert(tournamentMatches)
      .values({ tournamentId: id, fixtureId, matchId })
      .onConflictDoUpdate({ target: [tournamentMatches.tournamentId, tournamentMatches.fixtureId], set: { matchId } })
      .run();
  }
  fixtureOfMatch(matchId: string): { tournamentId: string; fixtureId: string } | null {
    return (
      this.db
        .select({ tournamentId: tournamentMatches.tournamentId, fixtureId: tournamentMatches.fixtureId })
        .from(tournamentMatches)
        .where(eq(tournamentMatches.matchId, matchId))
        .get() ?? null
    );
  }
  deleteTournament(id: string): void {
    this.db.delete(tournaments).where(eq(tournaments.id, id)).run(); // players, formats, links: cascade; matches stay
  }
}
