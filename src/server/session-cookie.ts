import { cookies } from "next/headers";
import { SESSION_LIFETIME_MS } from "./auth-service";
import { readEnv } from "./env";

/** The session cookie (M3): httpOnly, sameSite=lax, secure (unless COOKIE_SECURE=false), 1 year. */
export const SESSION_COOKIE = "darts_session";

export async function readSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: readEnv().cookieSecure,
    path: "/",
    maxAge: SESSION_LIFETIME_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
