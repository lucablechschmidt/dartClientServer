"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyDart, currentPlayer, openVisit, undoDart, type Actor, type Dart, type LegState, type MatchAccess, type PlayerId, type Rules } from "@/domain/x01";
import { restoreOpenVisit, storeOpenVisit } from "./open-visit-storage";
import { useMatchEvents } from "./use-match-events";

/** What the scoreboard needs from the server's MatchView (structural, no server import). */
export type MatchViewLike = {
  id: string;
  rules: Rules;
  state: LegState;
  names: Record<PlayerId, string>;
  match: MatchAccess;
  actor: Actor | null;
  access: { isOpen: boolean; canEnter: boolean; canUndo: boolean; canCancel: boolean };
};
export type ActionReply<Reason extends string> = { ok: true; view: MatchViewLike } | { ok: false; reason: Reason };
export type SyncStatus = "saved" | "saving" | "unsaved";

type Options<Reason extends string> = {
  initial: MatchViewLike;
  onCommitVisit: (matchId: string, seq: number, darts: Dart[]) => Promise<ActionReply<Reason>>;
  onUndoVisit: (matchId: string) => Promise<ActionReply<Reason>>;
  onLoad: (matchId: string) => Promise<ActionReply<Reason>>;
  /** Text for a domain or server error; shown in the status line. */
  errorText: (reason: Reason | "leg-finished" | "invalid-dart" | "nothing-to-undo") => string;
};

const RETRY_MS = [500, 1000, 2000, 4000, 8000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Number of closed visits; only those are known to the server. */
const closedCount = (state: LegState) => state.visits.length - (openVisit(state) ? 1 : 0);

/**
 * Local scoring plus server sync for the scoreboard (E11, E13). Darts are applied through the
 * domain immediately; only a closed visit (three darts, bust or checkout) goes out as an action,
 * as does undoing an already saved visit. Calls run in a sequential queue and are retried with
 * backoff indefinitely on network errors (status "unsaved"). A domain error from the server means
 * client and server diverged: the server state is adopted. Changes from other devices arrive via SSE.
 */
export function useVisitSync<Reason extends string>({ initial, onCommitVisit, onUndoVisit, onLoad, errorText }: Options<Reason>) {
  const [state, setState] = useState(initial.state);
  const [sync, setSync] = useState<SyncStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  /** Open/closed comes from the server (clock); who may enter right now the caller recomputes after every dart. */
  const [isOpen, setIsOpen] = useState(initial.access.isOpen);
  const queue = useRef(Promise.resolve());
  const inFlight = useRef(0);
  /** How many visits the server has after the calls already queued. */
  const committed = useRef(closedCount(initial.state));

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
            committed.current = server.visits.length;
            setIsOpen(reply.view.access.isOpen);
            // A locally open visit is kept; the rest is the server state.
            setState((local) => {
              const pending = openVisit(local);
              const keepOpen = pending && local.visits.length === server.visits.length + 1 && pending.playerId === currentPlayer(server);
              return { ...server, visits: keepOpen ? [...server.visits, pending] : server.visits };
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
  const syncServer = (next: LegState, thrown: Dart[]) => {
    const closed = closedCount(next);
    if (closed > committed.current) {
      const seq = committed.current;
      committed.current = closed;
      enqueue(() => onCommitVisit(initial.id, seq, thrown));
    } else if (closed < committed.current) {
      committed.current = closed;
      enqueue(() => onUndoVisit(initial.id));
    }
  };

  const throwDart = (dart: Dart) => {
    const r = applyDart(state, dart);
    if (!r.ok) return setError(errorText(r.reason));
    setState(r.value);
    setError(null);
    syncServer(r.value, [...(openVisit(state)?.darts ?? []), dart]);
  };

  const undo = () => {
    const r = undoDart(state);
    if (!r.ok) return setError(errorText(r.reason));
    setState(r.value);
    setError(null);
    syncServer(r.value, []);
  };

  return { state, sync, error, isOpen, throwDart, undo };
}
