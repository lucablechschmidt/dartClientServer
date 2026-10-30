import { describe, expect, it } from "vitest";
import { dequeue, emptyQueue, enqueue, isStale, pendingVisits, STALE_MS, type QueueItem } from "./sync-queue";

const commit = (seq: number): QueueItem => ({ kind: "commit", legIndex: 0, seq, darts: [{ field: 20, type: "single" }] });
const undo: QueueItem = { kind: "undo", step: "visit:0:1" };

describe("sync queue (M6)", () => {
  it("keeps the calls in order and counts the visits", () => {
    let q = enqueue(emptyQueue, commit(0), 100, false);
    q = enqueue(q, { kind: "starter", playerId: "a" }, 200, false);
    q = enqueue(q, commit(1), 300, false);
    expect(q.items.map((i) => i.kind)).toEqual(["commit", "starter", "commit"]);
    expect(pendingVisits(q)).toBe(2);
    expect(q.since).toBe(100);
  });

  it("an undo cancels the last unsent commit, play-out or decision; both stay off the server", () => {
    let q = enqueue(emptyQueue, commit(0), 100, false);
    q = enqueue(q, commit(1), 100, false);
    q = enqueue(q, undo, 100, false);
    expect(q.items).toEqual([commit(0)]);
    expect(enqueue(enqueue(emptyQueue, { kind: "play-out", value: true }, 1, false), undo, 1, false)).toEqual(emptyQueue);
    expect(enqueue(enqueue(emptyQueue, { kind: "decide", playerId: "a" }, 1, false), undo, 1, false)).toEqual(emptyQueue);
  });

  it("never cancels the call on its way, nor a starter choice", () => {
    const sending = enqueue(emptyQueue, commit(0), 100, true);
    expect(enqueue(sending, undo, 100, true).items).toEqual([commit(0), undo]);
    const starter = enqueue(emptyQueue, { kind: "starter", playerId: "a" }, 100, false);
    expect(enqueue(starter, undo, 100, false).items).toHaveLength(2);
  });

  it("stale after ten minutes without progress; every answered call restarts the clock", () => {
    let q = enqueue(enqueue(emptyQueue, commit(0), 0, false), commit(1), 0, false);
    expect(isStale(q, STALE_MS - 1)).toBe(false);
    expect(isStale(q, STALE_MS)).toBe(true);
    q = dequeue(q, STALE_MS);
    expect(isStale(q, STALE_MS + 1)).toBe(false);
    expect(dequeue(q, 0)).toEqual(emptyQueue);
    expect(isStale(emptyQueue, Number.MAX_SAFE_INTEGER)).toBe(false);
  });
});
