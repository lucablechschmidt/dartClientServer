"use client";

import { useEffect, useRef } from "react";

/**
 * Subscribes to a match's changes (SSE) and calls `onChange` on every event. The browser reconnects
 * EventSource on its own after drops; every (re)connect also calls `onChange`, because changes made
 * while the stream was down, or between rendering the page and subscribing, sent no event to this
 * device (M6). A hidden tab holds no stream (R-12: phones in a pocket kept one open on the Pi for
 * hours); when it becomes visible again it reconnects, and the connect brings the current state.
 */
export function useMatchEvents(matchId: string, onChange: () => void, enabled = true) {
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  });
  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;
    const fire = () => handler.current();
    let source: EventSource | null = null;
    const connect = () => {
      if (source) return;
      source = new EventSource(`/api/match/${matchId}/events`);
      source.addEventListener("change", fire);
      source.addEventListener("open", fire);
    };
    const disconnect = () => {
      if (!source) return;
      source.removeEventListener("change", fire);
      source.removeEventListener("open", fire);
      source.close();
      source = null;
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? disconnect() : connect());
    if (document.visibilityState !== "hidden") connect();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [matchId, enabled]);
}
