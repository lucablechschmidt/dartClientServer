/** Runs once at server start: opens the DB, applies migrations, creates the admin (M3) and starts the daily cleanup (E12, sessions). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDb } = await import("@/db/client");
    getDb();
    const { productionDeps } = await import("@/server/context");
    const { cleanupGuests, CLEANUP_INTERVAL_MS } = await import("@/server/guest-cleanup");
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
        const sessions = cleanupSessions(deps);
        if (removed > 0 || sessions > 0) log.info("cleanup", { guestMatches: removed, expiredSessions: sessions });
      } catch (e) {
        log.error("cleanup.failed", e);
      }
    };
    run();
    setInterval(run, CLEANUP_INTERVAL_MS).unref();
  }
}
