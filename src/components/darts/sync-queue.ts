import type { Dart, MatchState, PlayerId } from "@/domain/game";

/** One server call of the scoreboard (M6): stored on the device until the server has confirmed it. */
export type QueueItem =
  | { kind: "commit"; legIndex: number; seq: number; darts: Dart[] }
  | { kind: "undo"; step: string | null }
  | { kind: "play-out"; value: boolean }
  | { kind: "starter"; playerId: PlayerId }
  | { kind: "decide"; playerId: PlayerId };

/**
 * The calls not yet confirmed, oldest first. `since` is when the queue last made progress (or
 * became non-empty); after STALE_MS without progress the screen offers to resend or re-enter.
 */
export type Queue = { items: QueueItem[]; since: number | null };

export const STALE_MS = 10 * 60 * 1000;
export const emptyQueue: Queue = { items: [], since: null };

/** Steps an undo can cancel while they are still on the device: then neither goes to the server. */
const UNDOABLE: readonly QueueItem["kind"][] = ["commit", "play-out", "decide"];

/**
 * Appends a call. An undo right after a call that has not been sent yet cancels it (collapse);
 * `sending` is true while the first item is on its way, so that one is never cancelled.
 */
export function enqueue(q: Queue, item: QueueItem, now: number, sending: boolean): Queue {
  const last = q.items.at(-1);
  const lastIsUnsent = q.items.length > (sending ? 1 : 0);
  if (item.kind === "undo" && last && lastIsUnsent && UNDOABLE.includes(last.kind)) {
    const items = q.items.slice(0, -1);
    return { items, since: items.length > 0 ? q.since : null };
  }
  return { items: [...q.items, item], since: q.since ?? now };
}

/** Drops the first item after the server answered it; the stale clock starts again. */
export function dequeue(q: Queue, now: number): Queue {
  const items = q.items.slice(1);
  return { items, since: items.length > 0 ? now : null };
}

export const isStale = (q: Queue, now: number): boolean => q.since !== null && now - q.since >= STALE_MS;

/** Visits among the waiting calls, for the status line ("2 Aufnahmen nicht gespeichert"). */
export const pendingVisits = (q: Queue): number => q.items.filter((i) => i.kind === "commit").length;

/**
 * Storage: the queue together with the state the device showed, so that after a reload during an
 * outage the screen comes back as it was and the queue is played before the server state is taken.
 * Storage errors (private mode) are ignored, as for the open visit.
 */
const storageKey = (matchId: string) => `darts:queue:${matchId}`;
export type StoredQueue = { queue: Queue; state: MatchState };

export function storeQueue(matchId: string, queue: Queue, state: MatchState): void {
  try {
    if (queue.items.length === 0) localStorage.removeItem(storageKey(matchId));
    else localStorage.setItem(storageKey(matchId), JSON.stringify({ queue, state } satisfies StoredQueue));
  } catch {
    /* private mode or similar: then the queue does not survive a reload */
  }
}

export function restoreQueue(matchId: string): StoredQueue | null {
  try {
    const raw = localStorage.getItem(storageKey(matchId));
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredQueue;
    return Array.isArray(stored.queue.items) && stored.queue.items.length > 0 ? stored : null;
  } catch {
    return null;
  }
}
