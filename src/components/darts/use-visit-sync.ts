"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyMatchDart,
  decideWinner,
  closedVisits,
  currentLeg,
  matchCurrentPlayer,
  nextVisitPosition,
  openVisit,
  resign,
  rethrowable,
  setLegStarter,
  startPlayOut,
  undoMatchDart,
  undoStep,
  type Actor,
  type Dart,
  type MatchAccess,
  type MatchFormat,
  type MatchState,
  type PlayerId,
  type Rules,
} from "@/domain/game";
import { reapply, restoreOpenVisit, storeOpenVisit } from "./open-visit-storage";
import { dequeue, emptyQueue, enqueue, isStale, pendingVisits, restoreQueue, storeQueue, type Queue, type QueueItem } from "./sync-queue";
import { useMatchEvents } from "./use-match-events";

/** What the scoreboard needs from the server's MatchView (structural, no server import). */
export type MatchViewLike = {
  id: string;
  rules: Rules;
  format: MatchFormat;
  state: MatchState;
  names: Record<PlayerId, string>;
  match: MatchAccess;
  actor: Actor | null;
  access: { isOpen: boolean; canEnter: boolean; canUndo: boolean; canCancel: boolean };
  /** M9: tournament fixtures offer declaring the winner after a leg. */
  isTournament: boolean;
};
export type ActionReply<Reason extends string> = { ok: true; view: MatchViewLike } | { ok: false; reason: Reason };
export type SyncStatus = "saved" | "saving" | "unsaved";

type Options<Reason extends string> = {
  initial: MatchViewLike;
  onCommitVisit: (matchId: string, legIndex: number, seq: number, darts: Dart[]) => Promise<ActionReply<Reason>>;
  onUndoVisit: (matchId: string, step?: string) => Promise<ActionReply<Reason>>;
  onPlayOut: (matchId: string, playOut: boolean) => Promise<ActionReply<Reason>>;
  onSetStarter: (matchId: string, playerId: PlayerId) => Promise<ActionReply<Reason>>;
  onDecideWinner: (matchId: string, playerId: PlayerId) => Promise<ActionReply<Reason>>;
  onLoad: (matchId: string) => Promise<ActionReply<Reason>>;
  /** Text for a domain or server error; shown in the status line. */
  errorText: (
    reason:
      Reason | "leg-finished" | "invalid-dart" | "nothing-to-undo" | "no-play-out" | "leg-started" | "unknown-player" | "not-between-legs",
  ) => string;
};

const RETRY_MS = [500, 1000, 2000, 4000, 8000];
/** Backoff with ±20 % jitter, so several devices do not retry in step (M6). */
const backoff = (attempt: number) => (RETRY_MS.at(Math.min(attempt, RETRY_MS.length - 1)) ?? 8000) * (0.8 + Math.random() * 0.4);
const STALE_CHECK_MS = 15_000;

/** A backoff pause that `wake` can cut short (retry now). */
const pause = (ms: number, wake: { current: (() => void) | null }) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    wake.current = () => {
      clearTimeout(timer);
      resolve();
    };
  });

/**
 * Local scoring plus server sync for the scoreboard (E11, E13, M6). Darts are applied through the
 * domain immediately; only a closed visit (three darts, bust or checkout) goes out as a call, as do
 * undoing a stored step, play-out, the starter and a declared winner. The calls wait in a queue
 * that is kept in localStorage together with the shown state, so a reload during an outage loses
 * nothing: the queue is played first, then the server state is taken. Network errors are retried
 * with backoff without end ("unsaved"); `online`, a visible tab, `pageshow` and a tap on the status
 * line retry at once. A domain error from the server means client and server diverged: the message
 * is shown, the rest of the queue still goes out and the server state is taken at the end. After
 * ten minutes without progress the screen offers to resend or to drop the queue and re-enter.
 * Changes from other devices arrive via SSE while the queue is empty.
 */
export function useVisitSync<Reason extends string>({
  initial,
  onCommitVisit,
  onUndoVisit,
  onPlayOut,
  onSetStarter,
  onDecideWinner,
  onLoad,
  errorText,
}: Options<Reason>) {
  const matchId = initial.id;
  const [state, setState] = useState(initial.state);
  const [sync, setSync] = useState<SyncStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  /** Open/closed comes from the server (clock); who may enter right now the caller recomputes after every dart. */
  const [isOpen, setIsOpen] = useState(initial.access.isOpen);
  const [pending, setPending] = useState(0);
  const [stale, setStale] = useState(false);
  const stateRef = useRef(initial.state);
  const queue = useRef<Queue>(emptyQueue);
  const running = useRef(false);
  /** Raised by "re-enter": a loop of an older generation stops after its current await. */
  const generation = useRef(0);
  /** Cuts the current backoff pause short (retry now). */
  const wake = useRef<(() => void) | null>(null);
  /** How many visits the server has after the calls already queued. */
  const committed = useRef(closedVisits(initial.state));

  const show = useCallback((next: MatchState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const setQueue = useCallback(
    (next: Queue) => {
      queue.current = next;
      storeQueue(matchId, next, stateRef.current);
      setPending(pendingVisits(next));
      setStale(isStale(next, Date.now()));
    },
    [matchId],
  );

  const send = useCallback(
    (item: QueueItem): Promise<ActionReply<Reason>> => {
      switch (item.kind) {
        case "commit":
          return onCommitVisit(matchId, item.legIndex, item.seq, item.darts);
        case "undo":
          return onUndoVisit(matchId, item.step ?? undefined);
        case "play-out":
          return onPlayOut(matchId, item.value);
        case "starter":
          return onSetStarter(matchId, item.playerId);
        case "decide":
          return onDecideWinner(matchId, item.playerId);
      }
    },
    [matchId, onCommitVisit, onUndoVisit, onPlayOut, onSetStarter, onDecideWinner],
  );

  /** One call until it gets an answer; null if the queue was dropped meanwhile. */
  const untilAnswered = useCallback(async (call: () => Promise<ActionReply<Reason>>, gen: number): Promise<ActionReply<Reason> | null> => {
    for (let attempt = 0; ; attempt++) {
      try {
        const reply = await call();
        return gen === generation.current ? reply : null;
      } catch {
        if (gen !== generation.current) return null;
        setSync("unsaved");
        await pause(backoff(attempt), wake);
        if (gen !== generation.current) return null;
      }
    }
  }, []);

  /** Takes the server state; a locally open visit is kept on top if it still fits. */
  const adopt = useCallback(
    (view: MatchViewLike) => {
      const server = view.state;
      committed.current = closedVisits(server);
      setIsOpen(view.access.isOpen);
      const local = stateRef.current;
      const open = openVisit(currentLeg(local));
      const fits = open && closedVisits(local) === closedVisits(server) && open.playerId === matchCurrentPlayer(server);
      show(fits ? (reapply(server, rethrowable(open)) ?? server) : server);
    },
    [show],
  );

  /** Plays the queue to the end, then takes the server state (after a rejected call: freshly loaded). */
  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    const gen = generation.current;
    setSync("saving");
    let last: ActionReply<Reason> | null = null;
    let diverged = false;
    for (let item = queue.current.items.at(0); item; item = queue.current.items.at(0)) {
      const reply = await untilAnswered(() => send(item), gen);
      if (!reply) break;
      setQueue(dequeue(queue.current, Date.now()));
      if (reply.ok) last = reply;
      else {
        setError(errorText(reply.reason));
        diverged = true;
      }
      setSync(queue.current.items.length > 0 ? "saving" : "saved");
    }
    if (gen === generation.current && (diverged || !last)) last = await untilAnswered(() => onLoad(matchId), gen);
    // dropped meanwhile ("re-enter"): a newer loop owns the queue now
    if (gen !== generation.current) return;
    if (last?.ok && queue.current.items.length === 0) adopt(last.view);
    setSync("saved");
    running.current = false;
    // a call queued while the last answer was being taken over
    if (queue.current.items.length > 0) void run();
  }, [adopt, errorText, matchId, onLoad, send, setQueue, untilAnswered]);

  const push = useCallback(
    (item: QueueItem) => {
      setQueue(enqueue(queue.current, item, Date.now(), running.current));
      void run();
    },
    [run, setQueue],
  );

  const retryNow = useCallback(() => {
    wake.current?.();
    setStale(false);
  }, []);

  /** "Re-enter": drop what is still waiting and take the server state. */
  const discard = useCallback(() => {
    generation.current++;
    wake.current?.();
    setQueue(emptyQueue);
    setError(null);
    running.current = false;
    void (async () => {
      const gen = generation.current;
      setSync("saving");
      const reply = await untilAnswered(() => onLoad(matchId), gen);
      if (reply?.ok) {
        show(reply.view.state);
        adopt(reply.view);
      }
      if (gen === generation.current) setSync("saved");
    })();
  }, [adopt, matchId, onLoad, setQueue, show, untilAnswered]);

  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // After mount (not during server rendering): a stored queue brings back the state the device
  // showed and is played; otherwise this device's open visit is restored on top of the server state.
  // localStorage exists only in the browser, hence a deliberate setState in the effect (once per match).
  useEffect(() => {
    const stored = restoreQueue(matchId);
    if (stored) {
      stateRef.current = stored.state;
      committed.current = closedVisits(stored.state);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(stored.state);
      queue.current = stored.queue;
      setPending(pendingVisits(stored.queue));
      setStale(isStale(stored.queue, Date.now()));
      void runRef.current();
    } else show(restoreOpenVisit(matchId, stateRef.current));
  }, [matchId, show]);
  useEffect(() => {
    storeOpenVisit(matchId, state);
    if (queue.current.items.length > 0) storeQueue(matchId, queue.current, state);
  }, [matchId, state]);

  // M6: retry at once when the network or the tab comes back; check for a stale queue now and then.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && retryNow();
    window.addEventListener("online", retryNow);
    window.addEventListener("pageshow", retryNow);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => setStale(isStale(queue.current, Date.now())), STALE_CHECK_MS);
    return () => {
      window.removeEventListener("online", retryNow);
      window.removeEventListener("pageshow", retryNow);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [retryNow]);

  // M4: reload changes made elsewhere (other device, cancel); while own calls wait, the server
  // state comes with their answers anyway.
  useMatchEvents(matchId, () => {
    if (!running.current && queue.current.items.length === 0) void runRef.current();
  });

  /**
   * After a local change, decide whether a visit has to be saved or a stored step taken back.
   * `thrown` are the darts actually thrown in the visit; on a bust the triggering dart is not in
   * the state (only overthrown slots there), but the server needs it to recompute.
   */
  const syncServer = (prev: MatchState, next: MatchState, thrown: Dart[]) => {
    const closed = closedVisits(next);
    if (closed > committed.current) {
      const { legIndex, seq } = nextVisitPosition(prev);
      committed.current = closed;
      push({ kind: "commit", legIndex, seq, darts: thrown });
    } else if (
      closed < committed.current ||
      currentLeg(next).playOut !== currentLeg(prev).playOut ||
      next.decidedWinner !== prev.decidedWinner
    ) {
      // undo of a stored visit, a play-out decision or a declared winner (a step of its own on the server too)
      committed.current = closed;
      push({ kind: "undo", step: undoStep(prev) });
    }
  };

  const update = (next: MatchState) => {
    show(next);
    setError(null);
  };

  const throwDart = (dart: Dart) => {
    const r = applyMatchDart(state, dart);
    if (!r.ok) {
      setError(errorText(r.reason));
      return;
    }
    update(r.value);
    const open = openVisit(currentLeg(state));
    syncServer(state, r.value, [...(open ? rethrowable(open) : []), dart]);
  };

  const undo = () => {
    const r = undoMatchDart(state);
    if (!r.ok) {
      setError(errorText(r.reason));
      return;
    }
    update(r.value);
    syncServer(state, r.value, []);
  };

  /** M5 plan §9.2: the last player plays out (true) or gives up (false). */
  const playOut = (value: boolean) => {
    const leg = currentLeg(state);
    const r = value ? startPlayOut(leg) : resign(leg);
    if (!r.ok) {
      setError(errorText(r.reason));
      return;
    }
    update({ ...state, legs: [...state.legs.slice(0, -1), r.value] });
    push({ kind: "play-out", value });
  };

  /** ToStart before the first dart of a leg. */
  const chooseStarter = (playerId: PlayerId) => {
    const r = setLegStarter(state, playerId);
    if (!r.ok) {
      setError(errorText(r.reason));
      return;
    }
    update(r.value);
    push({ kind: "starter", playerId });
  };

  /** M9: declare the winner of a tournament fixture after a leg. */
  const decide = (playerId: PlayerId) => {
    const r = decideWinner(state, playerId);
    if (!r.ok) {
      setError(errorText(r.reason));
      return;
    }
    update(r.value);
    push({ kind: "decide", playerId });
  };

  return { state, sync, error, isOpen, pending, stale, throwDart, undo, playOut, chooseStarter, decide, retryNow, discard };
}
