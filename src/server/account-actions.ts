"use server";

import type { PasswordFormState, PlayerResult } from "@/domain/player";
import { changeOwnPassword } from "./auth-service";
import { renamePlayer } from "./player-service";
import { requireSession } from "./request";

export async function renameSelfAction(formData: FormData): Promise<PlayerResult> {
  const { deps, session } = await requireSession();
  return renamePlayer(deps, session, session.playerId, String(formData.get("name") ?? ""));
}

export async function changePasswordAction(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const { deps, session, token } = await requireSession();
  const next = String(formData.get("newPassword") ?? "");
  if (next !== String(formData.get("newPasswordRepeat") ?? "")) return { error: "password-mismatch", saved: false };
  const r = await changeOwnPassword(deps, session, token, String(formData.get("oldPassword") ?? ""), next);
  return r.ok ? { error: null, saved: true } : { error: r.reason, saved: false };
}
