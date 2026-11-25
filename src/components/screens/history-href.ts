import { HISTORY_MODES } from "./recent-games";

/**
 * The history's filter (`?mode=`, `?n=`) as a query string, "" without one. A game opened from the
 * history carries it along, so the way back leads to the same list. Anything else in the URL is dropped.
 */
export function historyQuery(params: { mode?: unknown; n?: unknown }): string {
  const mode = HISTORY_MODES.find((m) => m === params.mode);
  const n = typeof params.n === "string" && /^\d{1,6}$/.test(params.n) ? params.n : undefined;
  const query = new URLSearchParams({ ...(mode ? { mode } : {}), ...(n ? { n } : {}) }).toString();
  return query ? `?${query}` : "";
}

/** The history itself, with its filter. */
export const historyHref = (query: string) => `/history${query}`;

/** A game opened from the history: the scoreboard below `/history`, back leads to the list. */
export const historyMatchHref = (id: string, query: string) => `/history/match/${id}${query}`;

/** The X01 match page of a game opened from the history, back leads to that game. */
export const historyStatsHref = (id: string, query: string) => `/history/match/${id}/stats?from=match${query ? `&${query.slice(1)}` : ""}`;
