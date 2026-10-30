import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyMatchDart, closedVisits, newMatch, type Dart, type MatchState } from "@/domain/game";
import { useVisitSync, type ActionReply, type MatchViewLike } from "./use-visit-sync";

type Reply = ActionReply<"out-of-sync">;
const MATCH = "m1";
const rules = { startScore: 501, inRule: "single", outRule: "double" } as const;
const S20: Dart = { field: 20, type: "single" };
const state0 = newMatch(["a", "b"], rules, { legsToWinSet: 1, setsToWinMatch: 1 });
const view = (state: MatchState): MatchViewLike => ({
  id: MATCH,
  rules,
  format: state.format,
  state,
  names: { a: "Casey", b: "Sam" },
  match: {
    status: "running",
    startedAt: 0,
    inputMode: "single",
    hostPlayerId: null,
    players: [
      { id: "a", hasLogin: true },
      { id: "b", hasLogin: true },
    ],
  },
  actor: { id: "a", isAdmin: true },
  access: { isOpen: true, canEnter: true, canUndo: true, canCancel: true },
  isTournament: false,
});
const played = (darts: Dart[]) =>
  darts.reduce((s, d) => {
    const r = applyMatchDart(s, d);
    if (!r.ok) throw new Error(r.reason);
    return r.value;
  }, state0);

/** A fake server: stores the darts it got; `down` makes every call fail like a dead network. */
function server() {
  const fake = { down: false, darts: [] as Dart[], commits: 0, undos: [] as (string | undefined)[] };
  const reply = (): Promise<Reply> =>
    fake.down ? Promise.reject(new TypeError("Failed to fetch")) : Promise.resolve({ ok: true, view: view(played(fake.darts)) });
  const options = {
    onCommitVisit: vi.fn((_: string, __: number, ___: number, darts: Dart[]) => {
      if (fake.down) return reply();
      fake.commits++;
      fake.darts.push(...darts);
      return reply();
    }),
    onUndoVisit: vi.fn((_: string, step?: string) => {
      if (fake.down) return reply();
      fake.undos.push(step);
      fake.darts.splice(-3);
      return reply();
    }),
    onPlayOut: vi.fn(reply),
    onSetStarter: vi.fn(reply),
    onDecideWinner: vi.fn(reply),
    onLoad: vi.fn(reply),
    errorText: (reason: string) => reason,
  };
  return { fake, options };
}

const throwThree = (hook: { current: ReturnType<typeof useVisitSync> }) => {
  for (let i = 0; i < 3; i++) act(() => hook.current.throwDart(S20));
};

beforeEach(() => localStorage.clear());

describe("useVisitSync queue (M6)", () => {
  it("offline: the visit waits as 'unsaved', is kept in localStorage and goes out on retry", async () => {
    const { fake, options } = server();
    fake.down = true;
    const { result } = renderHook(() => useVisitSync({ initial: view(state0), ...options }));
    throwThree(result);
    await waitFor(() => expect(result.current.sync).toBe("unsaved"));
    expect(result.current.pending).toBe(1);
    expect(localStorage.getItem(`darts:queue:${MATCH}`)).toContain('"kind":"commit"');

    fake.down = false;
    act(() => result.current.retryNow());
    await waitFor(() => expect(result.current.sync).toBe("saved"));
    expect(fake.commits).toBe(1);
    expect(result.current.pending).toBe(0);
    expect(localStorage.getItem(`darts:queue:${MATCH}`)).toBeNull();
    expect(closedVisits(result.current.state)).toBe(1);
  });

  it("a reload during the outage brings back the shown state and plays the stored queue", async () => {
    const { fake, options } = server();
    fake.down = true;
    const first = renderHook(() => useVisitSync({ initial: view(state0), ...options }));
    throwThree(first.result);
    await waitFor(() => expect(first.result.current.sync).toBe("unsaved"));
    first.unmount();

    fake.down = false;
    // the page comes back with the server state, which does not know the visit yet
    const { result } = renderHook(() => useVisitSync({ initial: view(state0), ...options }));
    expect(closedVisits(result.current.state)).toBe(1);
    await waitFor(() => expect(fake.commits).toBe(1));
    await waitFor(() => expect(result.current.sync).toBe("saved"));
    expect(closedVisits(result.current.state)).toBe(1);
  });

  it("undo of a visit not yet sent cancels it; an undo of a stored visit names its step", async () => {
    const { fake, options } = server();
    fake.down = true;
    const { result } = renderHook(() => useVisitSync({ initial: view(state0), ...options }));
    throwThree(result);
    await waitFor(() => expect(result.current.sync).toBe("unsaved"));
    throwThree(result); // second visit, waits behind the first one on its way
    act(() => result.current.undo()); // reopens the second visit: both calls drop out
    expect(result.current.pending).toBe(1);

    fake.down = false;
    act(() => result.current.retryNow());
    await waitFor(() => expect(result.current.sync).toBe("saved"));
    expect(fake.commits).toBe(1);
    expect(options.onUndoVisit).not.toHaveBeenCalled();

    act(() => result.current.undo()); // takes a dart out of the open second visit: local only
    act(() => result.current.undo());
    act(() => result.current.undo()); // the stored first visit
    await waitFor(() => expect(fake.undos).toEqual(["visit:0:0"]));
  });
});
