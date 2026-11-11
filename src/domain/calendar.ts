/** Calendar helpers in the players' time zone: the Pi's container runs on UTC, the board stands in Germany. */
export const APP_TIME_ZONE = "Europe/Berlin";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Wall-clock date and time of `t` in `timeZone`, plus the weekday (0 = Monday). */
function wallClock(t: number, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(t)
      .map((p) => [p.type, p.value]),
  );
  const n = (k: string) => Number(parts[k]);
  return {
    year: n("year"),
    month: n("month"),
    day: n("day"),
    hour: n("hour"),
    minute: n("minute"),
    second: n("second"),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  };
}

/** How far the wall clock of `timeZone` is ahead of UTC at `t`, in ms (Berlin: 1 h or 2 h). */
function offset(t: number, timeZone: string): number {
  const w = wallClock(t, timeZone);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - (t - (t % 1000));
}

/** Monday 00:00 of the week `now` falls in, wall clock of `timeZone` ("Diese Woche" in the history). */
export function startOfWeek(now: number, timeZone: string = APP_TIME_ZONE): number {
  const w = wallClock(now, timeZone);
  const monday = Date.UTC(w.year, w.month - 1, w.day - w.weekday);
  // the wall time read as UTC, minus the offset; once more with the offset at that moment (summer time may differ)
  const guess = monday - offset(now, timeZone);
  return monday - offset(guess, timeZone);
}
