import type { PlayerId } from "@/domain/game";
import { MemoryStore, toPlayer } from "./memory-store";
import type { NewTournament, StoredTournament, TournamentRepository } from "./tournament-repository";

/** For service tests: same semantics as SqliteTournamentRepository, in memory only. */
export class MemoryTournamentRepository implements TournamentRepository {
  constructor(readonly store: MemoryStore = new MemoryStore()) {}

  createTournament(t: NewTournament): void {
    this.store.tournaments.set(t.id, { ...t, seeds: [...t.seeds], roundFormats: [...t.roundFormats], links: [] });
  }
  listTournaments(): StoredTournament[] {
    return [...this.store.tournaments.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .flatMap((t) => {
        const loaded = this.loadTournament(t.id);
        return loaded ? [loaded] : [];
      });
  }
  loadTournament(id: string): StoredTournament | null {
    const t = this.store.tournaments.get(id);
    if (!t) return null;
    // Like ON DELETE CASCADE: deleted players and matches drop out.
    const seeds = t.seeds.flatMap((p) => {
      const stored = this.store.players.get(p);
      return stored ? [toPlayer(stored)] : [];
    });
    const links = t.links.filter((l) => this.store.matches.has(l.matchId));
    return { ...t, seeds, roundFormats: [...t.roundFormats], links: [...links] };
  }
  setSeeds(id: string, seeds: PlayerId[]): void {
    const t = this.store.tournaments.get(id);
    if (t) t.seeds = [...seeds];
  }
  linkMatch(id: string, fixtureId: string, matchId: string): void {
    const t = this.store.tournaments.get(id);
    if (!t) return;
    t.links = [...t.links.filter((l) => l.fixtureId !== fixtureId), { fixtureId, matchId }];
  }
  fixtureOfMatch(matchId: string): { tournamentId: string; fixtureId: string } | null {
    for (const t of this.store.tournaments.values()) {
      const link = t.links.find((l) => l.matchId === matchId);
      if (link) return { tournamentId: t.id, fixtureId: link.fixtureId };
    }
    return null;
  }
  deleteTournament(id: string): void {
    this.store.tournaments.delete(id);
  }
}
