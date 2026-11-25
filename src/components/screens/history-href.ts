import { HISTORY_MODES } from "./recent-games";

/** The history's filter: the mode and how many games are shown. */
export type HistoryFilter = { mode?: string; n?: string };

/**
 * The history's filter from a URL's search params, invalid values dropped. A game opened from the
 * history carries it along, so the way back leads to the same list.
 */
export function historyFilter(params: { mode?: unknown; n?: unknown }): HistoryFilter {
  const mode = HISTORY_MODES.find((m) => m === params.mode);
  const n = typeof params.n === "string" && /^\d{1,6}$/.test(params.n) ? params.n : undefined;
  return { ...(mode ? { mode } : {}), ...(n ? { n } : {}) };
}

const withQuery = (path: string, params: Record<string, string>) => {
  const query = new URLSearchParams(params).toString();
  return query ? `${path}?${query}` : path;
};

/** The history itself, with its filter. */
export const historyHref = (filter: HistoryFilter) => withQuery("/history", filter);

/** A game opened from the history: the scoreboard below `/history`, back leads to the list. */
export const historyMatchHref = (id: string, filter: HistoryFilter) => withQuery(`/history/match/${id}`, filter);

/** The X01 match page of a game opened from the history, back leads to that game. */
export const historyStatsHref = (id: string, filter: HistoryFilter) =>
  withQuery(`/history/match/${id}/stats`, { from: "match", ...filter });
