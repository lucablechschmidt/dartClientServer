import { replayMatch, type PlayerId, type Visit } from "@/domain/game";
import { MemoryStore, toPlayer, type StoredLeg, type StoredMatch } from "./memory-store";
import type { ExpiredGuestMatch, LoadedMatch, MatchRepository, MatchStatus, NewLeg, NewMatch, OpenMatch, RecentMatch } from "./repository";

/** For service tests: same semantics as SqliteMatchRepository, in memory only. */
export class MemoryMatchRepository implements MatchRepository {
  constructor(readonly store: MemoryStore = new MemoryStore()) {}

  listExpiredGuestMatches(now: number): ExpiredGuestMatch[] {
    const out: ExpiredGuestMatch[] = [];
    for (const m of this.store.matches.values()) {
      const seated = m.playerIds.map((id) => this.store.players.get(id)!);
      const guests = seated.filter((p) => p.guestUntil !== null);
      if (guests.length === 0 || Math.max(...guests.map((p) => p.guestUntil!)) > now) continue;
      out.push({
        id: m.id,
        regularPlayerIds: seated.filter((p) => p.guestUntil === null).map((p) => p.id),
        visits: m.legs.flatMap((l) => l.visits),
      });
    }
    return out;
  }
  deleteMatch(matchId: string): void {
    this.store.matches.delete(matchId);
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
        players: m.playerIds.map((id) => toPlayer(this.store.players.get(id)!)),
        inputMode: m.inputMode,
        startedAt: m.startedAt,
      }));
  }
  listRecentMatches(openSince: number, limit: number): RecentMatch[] {
    return [...this.store.matches.values()]
      .filter((m) => m.status !== "running" || m.startedAt <= openSince)
      .sort((a, b) => (b.finishedAt ?? b.startedAt) - (a.finishedAt ?? a.startedAt))
      .slice(0, limit)
      .map((m) => ({
        id: m.id,
        mode: m.mode,
        players: m.playerIds.map((id) => toPlayer(this.store.players.get(id)!)),
        status: m.status,
        startedAt: m.startedAt,
        finishedAt: m.finishedAt,
        format: m.format,
        legWinners: m.legs.map((l) => l.winnerPlayerId),
        placements: { ...m.placements },
      }));
  }
  loadMatch(matchId: string): LoadedMatch | null {
    const m = this.store.matches.get(matchId);
    if (!m || m.legs.length === 0) return null;
    return {
      id: m.id,
      mode: m.mode,
      rules: m.rules,
      status: m.status,
      players: m.playerIds.map((id) => toPlayer(this.store.players.get(id)!)),
      inputMode: m.inputMode,
      hostPlayerId: m.hostPlayerId,
      startedAt: m.startedAt,
      finishedAt: m.finishedAt,
      format: m.format,
      legs: m.legs.map((l) => ({ id: l.id, setNo: l.setNo, legNo: l.legNo, winnerPlayerId: l.winnerPlayerId })),
      state: replayMatch(
        m.playerIds,
        m.rules,
        m.format,
        m.legs.map((l) => ({ starter: l.starterIndex, visits: l.visits, playOut: l.playOut })),
        0,
        m.mode,
      ),
    };
  }
  private matchOfLeg(legId: string): StoredMatch {
    const m = [...this.store.matches.values()].find((x) => x.legs.some((l) => l.id === legId));
    if (!m) throw new Error(`unknown leg ${legId}`);
    return m;
  }
  private legById(legId: string): StoredLeg {
    return this.matchOfLeg(legId).legs.find((l) => l.id === legId)!;
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
  setPlayOut(legId: string, playOut: boolean): void {
    this.legById(legId).playOut = playOut;
  }
  setPlacements(matchId: string, placements: Record<PlayerId, number | null>): void {
    const m = this.store.matches.get(matchId);
    if (m) m.placements = { ...m.placements, ...placements };
  }
}
