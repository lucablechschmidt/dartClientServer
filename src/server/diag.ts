import { readEnv } from "./env";

/**
 * M12 part B (m12-plan §B2): what the diagnostics page shows of a request. The forwarding headers of
 * Funnel and Caddy plus every `tailscale-*` header; never cookies or credentials.
 */
export const DIAG_HEADERS = [
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
  "host",
  "origin",
  "user-agent",
] as const;

/** Off unless DIAG_ENABLED=true; page, tick stream and action then answer as if they did not exist. */
export const diagEnabled = (): boolean => readEnv().diagEnabled;

/** The headers to show, in a fixed order; missing ones as null so the page says "fehlt". */
export function diagHeaders(headers: Headers): [string, string | null][] {
  const tailscale = [...headers.keys()].filter((k) => k.startsWith("tailscale-")).sort();
  return [...DIAG_HEADERS, ...tailscale].map((name) => [name, headers.get(name)]);
}

/** Ticks of the SSE test: count and gap (m12-plan §B2). */
export const DIAG_TICKS = 10;
export const DIAG_TICK_MS = 1000;
