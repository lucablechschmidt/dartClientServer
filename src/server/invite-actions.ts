"use server";

import { redirect } from "next/navigation";
import type { InviteFormState } from "@/domain/player";
import { productionDeps } from "./context";
import { redeem } from "./invite-service";
import { log } from "./log";
import { clientIp, loginLimiter } from "./rate-limit";
import { setSessionCookie } from "./session-cookie";

/** Redeem an invite (reachable without a session). On success, logged in on the home page. */
export async function redeemInviteAction(token: string, _prev: InviteFormState, formData: FormData): Promise<InviteFormState> {
  const ip = await clientIp();
  const limiter = loginLimiter();
  if (limiter.retryAfter(ip, Date.now()) > 0) return { error: "too-many-attempts" };
  const r = await redeem(productionDeps(), token, {
    name: formData.has("name") ? String(formData.get("name")) : undefined,
    password: String(formData.get("password") ?? ""),
    passwordRepeat: String(formData.get("passwordRepeat") ?? ""),
  });
  if (!r.ok) {
    // Only token guessing counts against the limit, typos in the form do not.
    if (r.reason === "invalid-token") limiter.fail(ip, Date.now());
    return { error: r.reason };
  }
  limiter.reset(ip);
  log.info("invite.redeemed", { player: r.session.name });
  await setSessionCookie(r.token);
  redirect("/");
}
