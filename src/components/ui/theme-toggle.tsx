"use client";

import { useSyncExternalStore } from "react";
import { applyPreference, nextPreference, readPreference, THEME_STORAGE_KEY, type ThemePreference } from "./theme";

type Labels = Record<ThemePreference, string> & { label: string };

/* localStorage as an external store: same source for all toggles and other tabs. */
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
const getSnapshot = (): ThemePreference => readPreference(localStorage);
const getServerSnapshot = (): ThemePreference => "system";

/**
 * A button that cycles System → Light → Dark. State lives in
 * localStorage and in the data-theme attribute; the inline script in the layout
 * restores it before the first paint.
 */
export function ThemeToggle({ labels }: { labels: Labels }) {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const cycle = () => {
    const next = nextPreference(preference);
    applyPreference(document.documentElement, next);
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private mode or similar: the attribute still applies to this page */
    }
    listeners.forEach((cb) => cb());
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={labels.label}
      title={labels.label}
      className="min-h-touch rounded-full border border-separator px-4 text-fg-muted hover:text-fg"
    >
      {labels[preference]}
    </button>
  );
}
