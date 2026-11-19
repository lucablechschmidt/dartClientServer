"use client";

import { useSyncExternalStore } from "react";

/*
 * Per-device settings in localStorage as an external store (Darstellung, Ton): the same source for every
 * component and for other tabs. Reads and writes survive a blocked storage (private mode or similar).
 */
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};

export function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** `null` removes the key (back to the default). */
export function writeSetting(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* blocked storage (private mode or similar): nothing is kept */
  }
  listeners.forEach((cb) => cb());
}

/** The parsed setting; `fallback` on the server and while nothing valid is stored. */
export function useSetting<T>(key: string, parse: (raw: string | null) => T, fallback: T): T {
  return useSyncExternalStore(
    subscribe,
    () => parse(readSetting(key)),
    () => fallback,
  );
}
