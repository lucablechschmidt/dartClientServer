"use client";

import { useSetting, writeSetting } from "./local-setting";
import { SegmentedControl } from "./segmented";
import { applyPreference, readPreference, THEME_PREFERENCES, THEME_STORAGE_KEY, type ThemePreference } from "./theme";

const parse = (raw: string | null): ThemePreference => readPreference({ getItem: () => raw });

type Labels = Record<ThemePreference, string> & { label: string };

/**
 * System, Light or Dark side by side (account tab). State lives in localStorage and in the
 * data-theme attribute; the inline script in the layout restores it before the first paint.
 */
export function ThemePicker({ labels }: { labels: Labels }) {
  const preference = useSetting(THEME_STORAGE_KEY, parse, "system");

  const choose = (next: ThemePreference) => {
    // With a blocked storage the attribute still applies to this page.
    applyPreference(document.documentElement, next);
    writeSetting(THEME_STORAGE_KEY, next === "system" ? null : next);
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
