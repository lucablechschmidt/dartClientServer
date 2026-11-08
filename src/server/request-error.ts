import { log } from "./log";

/** What Next.js passes to `onRequestError` (instrumentation.md), reduced to the fields we log. */
export type RequestInfo = { path: string; method: string };
export type RequestContext = { routePath: string; routeType: string };

const digestOf = (err: unknown): string | undefined =>
  typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;

/** redirect() and notFound() travel as errors too; they are control flow, not failures. */
const isNavigation = (digest: string | undefined) =>
  digest !== undefined && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"));

/**
 * R-03 (m13-plan.md): an unexpected error in a page, server action or route handler becomes one
 * JSON line, with the digest the user sees on the error page so both can be matched up.
 */
export function logRequestError(err: unknown, request: RequestInfo, context: RequestContext): void {
  const digest = digestOf(err);
  if (isNavigation(digest)) return;
  log.error("request.failed", err, {
    path: request.path,
    method: request.method,
    route: context.routePath,
    kind: context.routeType,
    digest,
  });
}
