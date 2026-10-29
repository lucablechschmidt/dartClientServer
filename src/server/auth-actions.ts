"use server";

import { redirect } from "next/navigation";
import type { LoginFormState } from "@/domain/player";
import { login, logout } from "./auth-service";
import { productionDeps } from "./context";
import { log } from "./log";
import { clientIp, loginLimiter } from "./rate-limit";
import { clearSessionCookie, readSessionToken, setSessionCookie } from "./session-cookie";


/** Only relative paths as target, otherwise back to the home page (no open redirect). */
const safeNext = (raw: FormDataEntryValue | null) => {
  const s = String(raw ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function loginAction(_prev: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const ip = await clientIp();
  const limiter = loginLimiter();
  if (limiter.retryAfter(ip, Date.now()) > 0) {
    log.warn("login.blocked", { ip });
    return { error: "too-many-attempts" };
  }
  const r = await login(productionDeps(), String(formData.get("name") ?? ""), String(formData.get("password") ?? ""));
  if (!r.ok) {
    limiter.fail(ip, Date.now());
    log.info("login.failed", { ip });
    return { error: r.reason };
  }
  limiter.reset(ip);
  log.info("login", { player: r.session.name, admin: r.session.isAdmin });
  await setSessionCookie(r.token);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  const token = await readSessionToken();
  if (token) logout(productionDeps(), token);
  await clearSessionCookie();
  redirect("/login");
}
