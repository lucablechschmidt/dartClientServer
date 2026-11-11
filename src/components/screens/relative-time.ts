import type { Texts } from "@/i18n/de";

/** "vor 12 min", computed from server time so server and client render the same. */
export function relativeTime(startedAt: number, now: number, t: Texts["overview"]): string {
  const minutes = Math.max(0, Math.round((now - startedAt) / 60_000));
  if (minutes < 1) return t.justNow;
  if (minutes < 60) return t.minutesAgo.replace("{n}", String(minutes));
  if (minutes < 24 * 60) return t.hoursAgo.replace("{n}", String(Math.round(minutes / 60)));
  return t.daysAgo.replace("{n}", String(Math.round(minutes / (24 * 60))));
}
