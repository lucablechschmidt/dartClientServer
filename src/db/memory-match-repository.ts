import { replay, type PlayerId, type Visit } from "@/domain/x01";
import { MemoryStore, toPlayer, type StoredMatch } from "./memory-store";
import type { ExpiredGuestMatch, LoadedMatch, MatchRepository, MatchStatus, NewMatch, OpenMatch } from "./repository";

/** For service tests: same semantics as SqliteMatchRepository, in memory only. */
export class MemoryMatchRepository implements MatchRepository {
  constructor(readonly store: MemoryStore = new MemoryStore()) {}

  listExpiredGuestMatches(now: number): ExpiredGuestMatch[] {
    const out: ExpiredGuestMatch[] = [];
    for (const m of this.store.matches.values()) {
      const seated = m.playerIds.map((id) => this.store.players.get(id)!);
      const guests = seated.filter((p) => p.guestUntil !== null);
      if (guests.length === 0 || Math.max(...guests.map((p) => p.guestUntil!)) > now) continue;
      out.push({ id: m.id, regularPlayerIds: seated.filter((p) => p.guestUntil === null).map((p) => p.id), visits: m.leg.visits });
    }
    return out;
  }
  deleteMatch(matchId: string): void {
    this.store.matches.delete(matchId);
  }
  createMatch(input: NewMatch): void {
    this.store.matches.set(input.id, {
      id: input.id,
      rules: input.rules,
      status: "running",
      playerIds: [...input.playerIds],
      inputMode: input.inputMode,
      hostPlayerId: input.hostPlayerId,
      startedAt: input.startedAt,
      finishedAt: null,
      leg: { id: input.legId, starterIndex: input.starterIndex, winnerPlayerId: null, visits: [] },
    });
  }
  listOpenMatches(openSince: number): OpenMatch[] {
    return [...this.store.matches.values()]
      .filter((m) => m.status === "running" && m.startedAt > openSince)
      .sort((a, b) => b.startedAt - a.startedAt)
      .map((m) => ({ id: m.id, players: m.playerIds.map((id) => toPlayer(this.store.players.get(id)!)), inputMode: m.inputMode, startedAt: m.startedAt }));
  }
  loadMatch(matchId: string): LoadedMatch | null {
    const m = this.store.matches.get(matchId);
    if (!m) return null;
    return {
      id: m.id,
      rules: m.rules,
      status: m.status,
      players: m.playerIds.map((id) => toPlayer(this.store.players.get(id)!)),
      inputMode: m.inputMode,
      hostPlayerId: m.hostPlayerId,
      startedAt: m.startedAt,
      finishedAt: m.finishedAt,
      leg: { id: m.leg.id, setNo: 1, legNo: 1, winnerPlayerId: m.leg.winnerPlayerId },
      state: replay(m.playerIds, m.rules, m.leg.visits, m.leg.starterIndex),
    };
  }
  private legById(legId: string): StoredMatch["leg"] {
    const m = [...this.store.matches.values()].find((x) => x.leg.id === legId);
    if (!m) throw new Error(`unknown leg ${legId}`);
    return m.leg;
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
}
