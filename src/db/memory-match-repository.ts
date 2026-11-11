import { replayMatch, type ModeId, type PlayerId, type Visit } from "@/domain/game";
import { MemoryStore, toPlayer, type StoredLeg, type StoredMatch } from "./memory-store";
import type {
  ExpiredGuestMatch,
  FinishedMatch,
  LoadedMatch,
  MatchRepository,
  MatchStatus,
  MatchSummary,
  NewLeg,
  NewMatch,
  OpenMatch,
  RecentMatch,
} from "./repository";

/** For service tests: same semantics as SqliteMatchRepository, in memory only. */
export class MemoryMatchRepository implements MatchRepository {
  constructor(readonly store: MemoryStore = new MemoryStore()) {}

  listExpiredGuestMatches(now: number): ExpiredGuestMatch[] {
    const out: ExpiredGuestMatch[] = [];
    for (const m of this.store.matches.values()) {
      const seated = m.playerIds.map((id) => this.store.player(id));
      const guests = seated.filter((p) => p.guestUntil !== null);
      if (guests.length === 0 || Math.max(...guests.map((p) => p.guestUntil ?? 0)) > now) continue;
      out.push({
        id: m.id,
        regularPlayerIds: seated.filter((p) => p.guestUntil === null && p.deletedAt === null).map((p) => p.id),
        visits: m.legs.flatMap((l) => l.visits),
        finished: this.finishedCore(m.id),
        abandoned: m.status === "abandoned",
      });
    }
    return out;
  }
  listAbandonedMatchIds(startedBefore: number): string[] {
    return [...this.store.matches.values()].filter((m) => m.status === "abandoned" && m.startedAt <= startedBefore).map((m) => m.id);
  }
  deleteMatch(matchId: string): void {
    this.store.matches.delete(matchId);
    // Like ON DELETE CASCADE on tournament_match: the fixture is open again.
    for (const t of this.store.tournaments.values()) t.links = t.links.filter((l) => l.matchId !== matchId);
  }
  listFinishedMatches(since: number | null, playerIds?: readonly PlayerId[]): FinishedMatch[] {
    return [...this.store.matches.values()]
      .filter((m) => m.status === "finished" && (since === null || (m.finishedAt ?? 0) >= since))
      .filter((m) => playerIds === undefined || m.playerIds.some((id) => playerIds.includes(id)))
      .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0))
      .flatMap((m) => {
        const f = this.finishedById(m.id);
        return f ? [f] : [];
      });
  }
  private finishedCore(id: string): ExpiredGuestMatch["finished"] {
    const f = this.finishedById(id);
    return f ? { mode: f.mode, state: f.state, placements: f.placements, finishedAt: f.finishedAt ?? f.startedAt } : null;
  }
  private finishedById(id: string): FinishedMatch | null {
    const stored = this.store.matches.get(id);
    const loaded = this.loadMatch(id);
    return stored?.status === "finished" && loaded ? { ...loaded, placements: { ...stored.placements } } : null;
  }
  listMatches(limit: number, offset: number): MatchSummary[] {
    return [...this.store.matches.values()]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(offset, offset + limit)
      .map((m) => ({
        id: m.id,
        mode: m.mode,
        rules: m.rules,
        status: m.status,
        players: m.playerIds.map((id) => toPlayer(this.store.player(id))),
        inputMode: m.inputMode,
        hostPlayerId: m.hostPlayerId,
        startedAt: m.startedAt,
        finishedAt: m.finishedAt,
        isTournament: m.isTournament,
      }));
  }
  createMatch(input: NewMatch): void {
    this.store.matches.set(input.id, {
      id: input.id,
      mode: input.mode,
      rules: input.rules,
      status: "running",
      playerIds: [...input.playerIds],
      inputMode: input.inputMode,
      hostPlayerId: input.hostPlayerId,
      startedAt: input.startedAt,
      isTournament: input.isTournament ?? false,
      decidedWinner: null,
      finishedAt: null,
      format: input.format,
      placements: Object.fromEntries(input.playerIds.map((p) => [p, null])),
      legs: [{ id: input.legId, setNo: 1, legNo: 1, starterIndex: input.starterIndex, winnerPlayerId: null, playOut: false, visits: [] }],
    });
  }
  listOpenMatches(openSince: number): OpenMatch[] {
    return [...this.store.matches.values()]
      .filter((m) => m.status === "running" && m.startedAt > openSince)
      .sort((a, b) => b.startedAt - a.startedAt)
      .map((m) => ({
        id: m.id,
        mode: m.mode,
        players: m.playerIds.map((id) => toPlayer(this.store.player(id))),
        inputMode: m.inputMode,
        startedAt: m.startedAt,
      }));
  }
  listOpenMatchIdsOf(playerId: PlayerId): string[] {
    return [...this.store.matches.values()]
      .filter((m) => m.status === "running" && (m.playerIds.includes(playerId) || m.hostPlayerId === playerId))
      .map((m) => m.id);
  }
  private recent(openSince: number, mode?: ModeId): StoredMatch[] {
    return [...this.store.matches.values()].filter(
      (m) => (m.status !== "running" || m.startedAt <= openSince) && (mode === undefined || m.mode === mode),
    );
  }
  countRecentMatches(openSince: number, mode?: ModeId): number {
    return this.recent(openSince, mode).length;
  }
  listRecentMatches(openSince: number, limit: number, mode?: ModeId): RecentMatch[] {
    return this.recent(openSince, mode)
      .sort((a, b) => (b.finishedAt ?? b.startedAt) - (a.finishedAt ?? a.startedAt))
      .slice(0, limit)
      .map((m) => ({
        id: m.id,
        mode: m.mode,
        rules: m.rules,
        players: m.playerIds.map((id) => toPlayer(this.store.player(id))),
        status: m.status,
        startedAt: m.startedAt,
        finishedAt: m.finishedAt,
        format: m.format,
        legWinners: m.legs.map((l) => l.winnerPlayerId),
        placements: { ...m.placements },
      }));
  }
  loadMatches(matchIds: readonly string[]): LoadedMatch[] {
    return matchIds.flatMap((id) => {
      const m = this.loadMatch(id);
      return m ? [m] : [];
    });
  }
  loadMatch(matchId: string): LoadedMatch | null {
    const m = this.store.matches.get(matchId);
    if (!m || m.legs.length === 0) return null;
    return {
      id: m.id,
      mode: m.mode,
      rules: m.rules,
      status: m.status,
      players: m.playerIds.map((id) => toPlayer(this.store.player(id))),
      inputMode: m.inputMode,
      hostPlayerId: m.hostPlayerId,
      startedAt: m.startedAt,
      finishedAt: m.finishedAt,
      isTournament: m.isTournament,
      format: m.format,
      legs: m.legs.map((l) => ({ id: l.id, setNo: l.setNo, legNo: l.legNo, winnerPlayerId: l.winnerPlayerId })),
      state: replayMatch(
        m.playerIds,
        m.rules,
        m.format,
        m.legs.map((l) => ({ starter: l.starterIndex, visits: l.visits, playOut: l.playOut })),
        0,
        m.mode,
        m.decidedWinner,
      ),
    };
  }
  setDecidedWinner(matchId: string, playerId: PlayerId | null): void {
    const m = this.store.matches.get(matchId);
    if (m) m.decidedWinner = playerId;
  }
  private matchOfLeg(legId: string): StoredMatch {
    const m = [...this.store.matches.values()].find((x) => x.legs.some((l) => l.id === legId));
    if (!m) throw new Error(`unknown leg ${legId}`);
    return m;
  }
  private legById(legId: string): StoredLeg {
    const leg = this.matchOfLeg(legId).legs.find((l) => l.id === legId);
    if (!leg) throw new Error(`unknown leg ${legId}`);
    return leg;
  }
  syncVisits(legId: string, all: Visit[], fromSeq: number): void {
    const leg = this.legById(legId);
    leg.visits = [...leg.visits.slice(0, fromSeq), ...all.slice(fromSeq).map((v) => ({ ...v, darts: [...v.darts] }))];
  }
  finishLeg(legId: string, winnerPlayerId: PlayerId): void {
    this.legById(legId).winnerPlayerId = winnerPlayerId;
  }
  reopenLeg(legId: string): void {
    this.legById(legId).winnerPlayerId = null;
  }
  setMatchStatus(matchId: string, status: MatchStatus, now: number): void {
    const m = this.store.matches.get(matchId);
    if (!m) return;
    m.status = status;
    m.finishedAt = status === "running" ? null : now;
  }
  createLeg(leg: NewLeg): void {
    const m = this.store.matches.get(leg.matchId);
    if (!m) throw new Error(`unknown match ${leg.matchId}`);
    const starterIndex = Math.max(0, m.playerIds.indexOf(leg.starterPlayerId));
    m.legs.push({ id: leg.id, setNo: leg.setNo, legNo: leg.legNo, starterIndex, winnerPlayerId: null, playOut: false, visits: [] });
  }
  deleteLeg(legId: string): void {
    const m = this.matchOfLeg(legId);
    m.legs = m.legs.filter((l) => l.id !== legId);
  }
  setLegStarter(legId: string, starterPlayerId: PlayerId): void {
    const m = this.matchOfLeg(legId);
    this.legById(legId).starterIndex = Math.max(0, m.playerIds.indexOf(starterPlayerId));
  }
  setSeatOrder(matchId: string, playerIds: readonly PlayerId[]): void {
    const m = this.store.matches.get(matchId);
    if (!m) return;
    // legs keep their starter by person; the memory store holds it as a seat index
    const starters = m.legs.map((l) => m.playerIds[l.starterIndex]);
    m.playerIds = [...playerIds];
    m.legs.forEach((l, i) => (l.starterIndex = Math.max(0, m.playerIds.indexOf(starters[i]))));
  }
  setPlayOut(legId: string, playOut: boolean): void {
    this.legById(legId).playOut = playOut;
  }
  setPlacements(matchId: string, placements: Record<PlayerId, number | null>): void {
    const m = this.store.matches.get(matchId);
    if (m) m.placements = { ...m.placements, ...placements };
  }
}
