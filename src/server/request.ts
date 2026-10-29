import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Session } from "@/domain/player";
import { sessionFromToken } from "./auth-service";
import { productionDeps } from "./context";
import type { Deps } from "./deps";
import { readSessionToken } from "./session-cookie";

/**
 * For Server Components: waits for the real request (no prerender with
 * synchronous SQLite reads, see the Next docs on connection()) and returns the deps.
 */
export async function requestDeps(): Promise<Deps> {
  await connection();
  return productionDeps();
}

/** The session of the request, or null. For pages that handle both (e.g. login). */
export async function currentSession(): Promise<Session | null> {
  // Like requireSession: wait for the real request before reading the clock (sessionFromToken uses now()).
  await connection();
  const token = await readSessionToken();
  return token ? sessionFromToken(productionDeps(), token) : null;
}

/**
 * Access control (M3, E10): every page and every action except login and invite calls this.
 * Without a valid session there is the login page, never data. The proxy only checks that the cookie exists.
 */
export async function requireSession(): Promise<{ deps: Deps; session: Session; token: string }> {
  await connection();
  const token = await readSessionToken();
  const deps = productionDeps();
  const session = token ? sessionFromToken(deps, token) : null;
  if (!session || !token) redirect("/login");
  return { deps, session, token };
}

export async function requireAdmin(): Promise<{ deps: Deps; session: Session; token: string }> {
  const ctx = await requireSession();
  if (!ctx.session.isAdmin) redirect("/");
  return ctx;
}
