import { applyMatchDart, currentLeg, nextVisitPosition, openVisit, rethrowable, type Dart, type MatchState } from "@/domain/game";

/**
 * The open visit lives only on this device (E11). To survive a reload it is kept in localStorage,
 * together with the position at which it fits the server state. Storage errors (private mode)
 * are ignored: then the open visit simply does not survive a reload.
 */
const storageKey = (matchId: string) => `darts:open-visit:${matchId}`;
type StoredOpen = { legIndex: number; seq: number; darts: Dart[] };

/** Re-applies the stored darts on top of the server state, if they still fit there. */
export function restoreOpenVisit(matchId: string, server: MatchState): MatchState {
  try {
    const raw = localStorage.getItem(storageKey(matchId));
    if (!raw) return server;
    const stored = JSON.parse(raw) as StoredOpen;
    const at = nextVisitPosition(server);
    if (stored.legIndex !== at.legIndex || stored.seq !== at.seq || openVisit(currentLeg(server))) return server;
    return reapply(server, stored.darts) ?? server;
  } catch {
    return server;
  }
}

/** The darts of an open visit applied on top of `state`; null if they no longer form an open visit there. */
export function reapply(state: MatchState, darts: Dart[]): MatchState | null {
  let next = state;
  for (const dart of darts) {
    const r = applyMatchDart(next, dart);
    if (!r.ok) return null;
    next = r.value;
  }
  return openVisit(currentLeg(next)) ? next : null;
}

export function storeOpenVisit(matchId: string, state: MatchState): void {
  try {
    const open = openVisit(currentLeg(state));
    if (open) localStorage.setItem(storageKey(matchId), JSON.stringify({ ...nextVisitPosition(state), darts: rethrowable(open) } satisfies StoredOpen));
    else localStorage.removeItem(storageKey(matchId));
  } catch {
    /* private mode or similar: then do without */
  }
}
