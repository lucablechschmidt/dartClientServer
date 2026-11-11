import type { Instrumentation } from "next";

/** Runs once at server start: opens the DB, applies migrations, creates the admin (M3) and starts the daily cleanup (E12, sessions). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { closeDb, getDb } = await import("@/db/client");
    getDb();
    const { productionDeps } = await import("@/server/context");
    const { cleanupAbandoned, cleanupGuests, CLEANUP_INTERVAL_MS } = await import("@/server/guest-cleanup");
    const { bootstrapAdmin, cleanupSessions } = await import("@/server/auth-service");
    const { readEnv } = await import("@/server/env");
    const env = readEnv();
    const { log } = await import("@/server/log");
    if (!env.admin) log.warn("admin.bootstrap.skipped", { reason: "ADMIN_USER or ADMIN_PASSWORD_HASH missing" });
    else if (bootstrapAdmin(productionDeps(), env)) log.info("admin.bootstrap", { name: env.admin.name });
    const run = () => {
      try {
        const deps = productionDeps();
        const removed = cleanupGuests(deps);
        const abandoned = cleanupAbandoned(deps);
        const sessions = cleanupSessions(deps);
        if (removed > 0 || abandoned > 0 || sessions > 0)
          log.info("cleanup", { guestMatches: removed, abandonedMatches: abandoned, expiredSessions: sessions });
      } catch (e) {
        log.error("cleanup.failed", e);
      }
    };
    run();
    // R-22 (m13-plan.md): register can run again on hot reload in development; one timer and one exit hook per process.
    // Next exits on SIGTERM itself (process.exit), so closing on "exit" covers `docker compose stop` without holding it up.
    const g = globalThis as unknown as { __dartsCleanupTimer?: ReturnType<typeof setInterval>; __dartsCloseOnExit?: boolean };
    if (g.__dartsCleanupTimer) clearInterval(g.__dartsCleanupTimer);
    g.__dartsCleanupTimer = setInterval(run, CLEANUP_INTERVAL_MS).unref();
    if (!g.__dartsCloseOnExit) {
      process.once("exit", closeDb);
      g.__dartsCloseOnExit = true;
    }
  }
}

/** Unexpected errors in pages, actions and route handlers as one JSON line (m13-plan.md R-03). */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { logRequestError } = await import("@/server/request-error");
  logRequestError(err, request, context);
};
