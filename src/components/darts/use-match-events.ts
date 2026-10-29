"use client";

import { useEffect, useRef } from "react";

/**
 * Subscribes to a match's changes (SSE) and calls `onChange` on every event and when the
 * tab becomes visible. The browser reconnects EventSource on its own after drops.
 */
export function useMatchEvents(matchId: string, onChange: () => void, enabled = true) {
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  });
  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;
    const source = new EventSource(`/api/match/${matchId}/events`);
    const fire = () => handler.current();
    source.addEventListener("change", fire);
    const onVisible = () => document.visibilityState === "visible" && fire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      source.removeEventListener("change", fire);
      source.close();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [matchId, enabled]);
}
