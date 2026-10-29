import { applyDart, openVisit, winnerOf, type Dart, type LegState } from "@/domain/x01";

/**
 * The open visit lives only on this device (E11). To survive a reload it is kept in localStorage,
 * together with the position at which it fits the server state. Storage errors (private mode)
 * are ignored: then the open visit simply does not survive a reload.
 */
const storageKey = (matchId: string) => `darts:open-visit:${matchId}`;
type StoredOpen = { seq: number; darts: Dart[] };

/** Re-applies the stored darts on top of the server state, if they still fit there. */
export function restoreOpenVisit(matchId: string, server: LegState): LegState {
  try {
    const raw = localStorage.getItem(storageKey(matchId));
    if (!raw) return server;
    const stored = JSON.parse(raw) as StoredOpen;
    if (stored.seq !== server.visits.length || openVisit(server) || winnerOf(server)) return server;
    let state = server;
    for (const dart of stored.darts) {
      const r = applyDart(state, dart);
      if (!r.ok) return server;
      state = r.value;
    }
    return openVisit(state) ? state : server;
  } catch {
    return server;
  }
}

export function storeOpenVisit(matchId: string, state: LegState): void {
  try {
    const open = openVisit(state);
    if (open) localStorage.setItem(storageKey(matchId), JSON.stringify({ seq: state.visits.length - 1, darts: open.darts } satisfies StoredOpen));
    else localStorage.removeItem(storageKey(matchId));
  } catch {
    /* private mode or similar: then do without */
  }
}
