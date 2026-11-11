"use client";

import { useSyncExternalStore } from "react";
import { SegmentedControl } from "./segmented";
import { applyPreference, readPreference, THEME_PREFERENCES, THEME_STORAGE_KEY, type ThemePreference } from "./theme";

type Labels = Record<ThemePreference, string> & { label: string };

/* localStorage as an external store: same source for every picker and other tabs. */
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
 * System, Light or Dark side by side (account tab). State lives in localStorage and in the
 * data-theme attribute; the inline script in the layout restores it before the first paint.
 */
export function ThemePicker({ labels }: { labels: Labels }) {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const choose = (next: ThemePreference) => {
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
    <SegmentedControl
      label={labels.label}
      options={THEME_PREFERENCES.map((p) => ({ value: p, label: labels[p] }))}
      value={preference}
      onChange={choose}
    />
  );
}
