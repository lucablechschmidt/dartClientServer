import type { MatchStatus } from "@/db/repository";
import type { ModeId } from "@/domain/game";
import type { Session } from "@/domain/player";
import type { Deps } from "./deps";
import { shownName } from "./player-names";

/**
 * Admin clean-up (tab "Verwaltung"): delete games and tournaments started by mistake or for testing.
 * Deleted games are gone everywhere: history, overview and statistics. Admins only.
 */

export type CleanupError = "forbidden" | "not-found";
type CleanupResult = { ok: true } | { ok: false; reason: CleanupError };

/** Games per page of the admin list ("Mehr anzeigen" loads the next one). */
export const ADMIN_MATCH_PAGE = 20;

export type AdminMatchItem = { id: string; mode: ModeId; names: string[]; status: MatchStatus; startedAt: number; isTournament: boolean };

const forbidden = { ok: false, reason: "forbidden" } as const;

/** Every match, newest first, one page from `offset`; `hasMore` when another page follows. */
export function listAllMatches(
  deps: Deps,
  session: Session,
  offset: number,
): { ok: true; items: AdminMatchItem[]; hasMore: boolean } | { ok: false; reason: "forbidden" } {
  if (!session.isAdmin) return forbidden;
  const page = deps.matches.listMatches(ADMIN_MATCH_PAGE + 1, Math.max(0, Math.floor(offset)));
  const items = page.slice(0, ADMIN_MATCH_PAGE).map((m) => ({
    id: m.id,
    mode: m.mode,
    names: m.players.map(shownName),
    status: m.status,
    startedAt: m.startedAt,
    isTournament: m.isTournament,
  }));
  return { ok: true, items, hasMore: page.length > ADMIN_MATCH_PAGE };
}

/** One game with its legs and visits; a tournament fixture it played is open again. */
export function deleteMatchAsAdmin(deps: Deps, session: Session, matchId: string): CleanupResult {
  if (!session.isAdmin) return forbidden;
  if (!deps.matches.loadMatch(matchId)) return { ok: false, reason: "not-found" };
  deps.transaction(() => deps.matches.deleteMatch(matchId));
  deps.events.publish(matchId); // open screens reload and find the game gone
  return { ok: true };
}

/** A tournament together with all its games (unlike "delete" on the tournament page, which keeps them). */
export function deleteTournamentWithMatches(deps: Deps, session: Session, tournamentId: string): CleanupResult {
  if (!session.isAdmin) return forbidden;
  const t = deps.tournaments.loadTournament(tournamentId);
  if (!t) return { ok: false, reason: "not-found" };
  const games = t.links.map((l) => l.matchId);
  deps.transaction(() => {
    for (const id of games) deps.matches.deleteMatch(id);
    deps.tournaments.deleteTournament(tournamentId);
  });
  for (const id of games) deps.events.publish(id);
  return { ok: true };
}
