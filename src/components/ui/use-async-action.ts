"use client";

import { useRef, useState, useTransition } from "react";

/** The failure reason of an action result (`{ ok: false; reason }`), never for other results. */
export type ReasonOf<R> = R extends { ok: false; reason: infer E } ? E : never;

const reasonOf = <R>(result: R): ReasonOf<R> | null =>
  typeof result === "object" && result !== null && "ok" in result && result.ok === false && "reason" in result
    ? (result.reason as ReasonOf<R>)
    : null;

/**
 * R-16 (m13-plan.md, §6 question 5): a button that calls a server action directly. `run` is ignored
 * while a call is under way (no second send on a double tap); `pending` stays true until the answer
 * is shown, including a navigation the action starts with `redirect`; `running` holds the arguments
 * of the call, so a list can mark the one row that is busy. `error` is the reason of the last result
 * when it failed, null otherwise; `onResult` gets every result (lists keep their errors per row).
 * Built on useTransition: the result is applied in a transition, a thrown error reaches error.tsx.
 */
export function useAsyncAction<A extends unknown[], R>(action: (...args: A) => Promise<R>, onResult?: (result: R, ...args: A) => void) {
  const [transition, startTransition] = useTransition();
  const [running, setRunning] = useState<A | null>(null);
  const [error, setError] = useState<ReasonOf<R> | null>(null);
  /** Set synchronously, so a second tap before the next render is ignored too. */
  const busy = useRef(false);

  const run = (...args: A) => {
    if (busy.current) return;
    busy.current = true;
    setRunning(args);
    startTransition(async () => {
      try {
        const result = await action(...args);
        startTransition(() => {
          setError(reasonOf(result));
          onResult?.(result, ...args);
        });
      } finally {
        busy.current = false;
        startTransition(() => setRunning(null));
      }
    });
  };

  const pending = transition || running !== null;
  /** Props for the button of one row in a list: busy on the row whose call runs (first argument), every row disabled meanwhile. */
  const rowButton = (key: A[0]) => ({ pending: running?.[0] === key, disabled: pending });

  return { pending, running, error, run, rowButton };
}
