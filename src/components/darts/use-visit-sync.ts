"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyMatchDart,
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
  type Actor,
  type Dart,
  type MatchAccess,
  type MatchFormat,
  type MatchState,
  type PlayerId,
  type Rules,
} from "@/domain/game";
import { reapply, restoreOpenVisit, storeOpenVisit } from "./open-visit-storage";
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
};
export type ActionReply<Reason extends string> = { ok: true; view: MatchViewLike } | { ok: false; reason: Reason };
export type SyncStatus = "saved" | "saving" | "unsaved";

type Options<Reason extends string> = {
  initial: MatchViewLike;
  onCommitVisit: (matchId: string, legIndex: number, seq: number, darts: Dart[]) => Promise<ActionReply<Reason>>;
  onUndoVisit: (matchId: string) => Promise<ActionReply<Reason>>;
  onPlayOut: (matchId: string, playOut: boolean) => Promise<ActionReply<Reason>>;
  onSetStarter: (matchId: string, playerId: PlayerId) => Promise<ActionReply<Reason>>;
  onLoad: (matchId: string) => Promise<ActionReply<Reason>>;
  /** Text for a domain or server error; shown in the status line. */
  errorText: (reason: Reason | "leg-finished" | "invalid-dart" | "nothing-to-undo" | "no-play-out" | "leg-started" | "unknown-player") => string;
};

const RETRY_MS = [500, 1000, 2000, 4000, 8000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Local scoring plus server sync for the scoreboard (E11, E13). Darts are applied through the
 * domain immediately; only a closed visit (three darts, bust or checkout) goes out as an action,
 * as does undoing an already saved visit. Calls run in a sequential queue and are retried with
 * backoff indefinitely on network errors (status "unsaved"). A domain error from the server means
 * client and server diverged: the server state is adopted. Changes from other devices arrive via SSE.
 * M5: the state is the whole match; play-out and the starter go through the same queue.
 */
export function useVisitSync<Reason extends string>({ initial, onCommitVisit, onUndoVisit, onPlayOut, onSetStarter, onLoad, errorText }: Options<Reason>) {
  const [state, setState] = useState(initial.state);
  const [sync, setSync] = useState<SyncStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  /** Open/closed comes from the server (clock); who may enter right now the caller recomputes after every dart. */
  const [isOpen, setIsOpen] = useState(initial.access.isOpen);
  const queue = useRef(Promise.resolve());
  const inFlight = useRef(0);
  /** How many visits the server has after the calls already queued. */
  const committed = useRef(closedVisits(initial.state));

  // After mount (not during server rendering): restore this device's open visit.
  // localStorage exists only in the browser, hence a deliberate setState in the effect (once per match).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => restoreOpenVisit(initial.id, s));
  }, [initial.id]);
  useEffect(() => storeOpenVisit(initial.id, state), [initial.id, state]);

  const retrying = useCallback(async (fn: () => Promise<ActionReply<Reason>>): Promise<ActionReply<Reason>> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn();
      } catch {
        setSync("unsaved");
        await sleep(RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]);
      }
    }
  }, []);

  const enqueue = useCallback(
    (fn: () => Promise<ActionReply<Reason>>) => {
      inFlight.current++;
      setSync("saving");
      queue.current = queue.current.then(async () => {
        let reply = await retrying(fn);
        if (!reply.ok) {
          setError(errorText(reply.reason));
          reply = await retrying(() => onLoad(initial.id));
        }
        inFlight.current--;
        // The server state applies only when nothing else is in flight; otherwise it would already be stale.
        if (inFlight.current === 0) {
          if (reply.ok) {
            const server = reply.view.state;
            committed.current = closedVisits(server);
            setIsOpen(reply.view.access.isOpen);
            // A locally open visit is kept on top of the server state if it still fits; the rest is the server state.
            setState((local) => {
              const pending = openVisit(currentLeg(local));
              const fits = pending && closedVisits(local) === closedVisits(server) && pending.playerId === matchCurrentPlayer(server);
              return (fits && reapply(server, rethrowable(pending))) || server;
            });
          }
          setSync("saved");
        }
      });
    },
    [initial.id, onLoad, retrying, errorText],
  );

  // M4: reload changes made elsewhere (other device, cancel); while own calls are in flight,
  // the server state arrives with their reply anyway.
  useMatchEvents(initial.id, () => {
    if (inFlight.current === 0) enqueue(() => onLoad(initial.id));
  });

  /**
   * After a local change, decide whether a visit has to be saved or deleted.
   * `thrown` are the darts actually thrown in the visit; on a bust the triggering dart is not in
   * the state (only overthrown slots there), but the server needs it to recompute.
   */
  const syncServer = (prev: MatchState, next: MatchState, thrown: Dart[]) => {
    const closed = closedVisits(next);
    if (closed > committed.current) {
      const { legIndex, seq } = nextVisitPosition(prev);
      committed.current = closed;
      enqueue(() => onCommitVisit(initial.id, legIndex, seq, thrown));
    } else if (closed < committed.current || currentLeg(next).playOut !== currentLeg(prev).playOut) {
      // undo of a stored visit, or of a play-out decision (a step of its own on the server too)
      committed.current = closed;
      enqueue(() => onUndoVisit(initial.id));
    }
  };

  const update = (next: MatchState) => {
    setState(next);
    setError(null);
  };

  const throwDart = (dart: Dart) => {
    const r = applyMatchDart(state, dart);
    if (!r.ok) return setError(errorText(r.reason));
    update(r.value);
    const open = openVisit(currentLeg(state));
    syncServer(state, r.value, [...(open ? rethrowable(open) : []), dart]);
  };

  const undo = () => {
    const r = undoMatchDart(state);
    if (!r.ok) return setError(errorText(r.reason));
    update(r.value);
    syncServer(state, r.value, []);
  };

  /** M5 plan §9.2: the last player plays out (true) or gives up (false). */
  const playOut = (value: boolean) => {
    const leg = currentLeg(state);
    const r = value ? startPlayOut(leg) : resign(leg);
    if (!r.ok) return setError(errorText(r.reason));
    update({ ...state, legs: [...state.legs.slice(0, -1), r.value] });
    enqueue(() => onPlayOut(initial.id, value));
  };

  /** ToStart before the first dart of a leg. */
  const chooseStarter = (playerId: PlayerId) => {
    const r = setLegStarter(state, playerId);
    if (!r.ok) return setError(errorText(r.reason));
    update(r.value);
    enqueue(() => onSetStarter(initial.id, playerId));
  };

  return { state, sync, error, isOpen, throwDart, undo, playOut, chooseStarter };
}
