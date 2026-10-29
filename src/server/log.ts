/**
 * Structured server log (architecture.md §9): one JSON line per event on stdout/stderr, readable with
 * `docker compose logs app` and filterable with `jq`. No secrets in fields: never passwords, hashes
 * or tokens; player names and ids are fine.
 */
type Level = "info" | "warn" | "error";
export type LogFields = Record<string, string | number | boolean | null | undefined>;

type Sink = (line: string, level: Level) => void;
const defaultSink: Sink = (line, level) => (level === "error" ? console.error(line) : console.log(line));
let sink: Sink = defaultSink;

/** Tests swap the sink to capture lines; pass nothing to restore stdout/stderr. */
export function setLogSink(next?: Sink): void {
  sink = next ?? defaultSink;
}

function errorFields(err: unknown): LogFields {
  if (err instanceof Error) return { error: err.message, stack: err.stack?.split("\n").slice(0, 4).join(" | ") };
  return { error: String(err) };
}

function write(level: Level, event: string, fields: LogFields = {}): void {
  const entry: Record<string, unknown> = { t: new Date().toISOString(), level, event };
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) entry[k] = v;
  sink(JSON.stringify(entry), level);
}

export const log = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, err: unknown, fields?: LogFields) => write("error", event, { ...fields, ...errorFields(err) }),
};
