/**
 * Theme logic without React, so it is testable and used the same way by the inline script
 * (before the first paint) and by the toggle.
 */
export const THEME_STORAGE_KEY = "theme";
export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = "light" | "dark";

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function readPreference(storage: Pick<Storage, "getItem"> | null): ThemePreference {
  try {
    const raw = storage?.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

export function nextPreference(current: ThemePreference): ThemePreference {
  const i = THEME_PREFERENCES.indexOf(current);
  return THEME_PREFERENCES[(i + 1) % THEME_PREFERENCES.length];
}

/** Sets data-theme only for an explicit choice; "system" removes the attribute (CSS then uses prefers-color-scheme). */
export function applyPreference(root: HTMLElement, preference: ThemePreference): void {
  if (preference === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
}

/**
 * Inline script for <head>: reads the stored choice and sets the attribute
 * before rendering. Follows the same rules as applyPreference.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
