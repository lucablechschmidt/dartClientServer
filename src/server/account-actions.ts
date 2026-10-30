"use server";

import type { PasswordFormState, PlayerResult } from "@/domain/player";
import { changeOwnPassword } from "./auth-service";
import { renamePlayer } from "./player-service";
import { requireSession } from "./request";
import { formText } from "./form";

export async function renameSelfAction(formData: FormData): Promise<PlayerResult> {
  const { deps, session } = await requireSession();
  return renamePlayer(deps, session, session.playerId, formText(formData, "name"));
}

export async function changePasswordAction(_prev: PasswordFormState, formData: FormData): Promise<PasswordFormState> {
  const { deps, session, token } = await requireSession();
  const next = formText(formData, "newPassword");
  if (next !== formText(formData, "newPasswordRepeat")) return { error: "password-mismatch", saved: false };
  const r = await changeOwnPassword(deps, session, token, formText(formData, "oldPassword"), next);
  return r.ok ? { error: null, saved: true } : { error: r.reason, saved: false };
}
