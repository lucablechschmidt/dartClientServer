"use server";

import type { GuestResult, PlayerResult } from "@/domain/player";
import { createGuest, deletePlayer, renamePlayer } from "./player-service";
import { requireSession } from "./request";
import { revalidatePlayerLists } from "./revalidate";
import { formText } from "./form";
import { isId } from "./action-input";

export async function renamePlayerAction(formData: FormData): Promise<PlayerResult> {
  const { deps, session } = await requireSession();
  const id = formText(formData, "id");
  if (!isId(id)) return { ok: false, reason: "not-found" };
  const r = renamePlayer(deps, session, id, formText(formData, "name"));
  revalidatePlayerLists();
  return r;
}

/** E12: guest for the evening; returns the id so the setup can select them right away. */
export async function createGuestAction(formData: FormData): Promise<GuestResult> {
  const { deps } = await requireSession();
  const r = createGuest(deps, formText(formData, "name"));
  revalidatePlayerLists();
  return r.ok ? { ok: true, id: r.player.id } : r;
}

export async function deletePlayerAction(formData: FormData): Promise<PlayerResult> {
  const { deps, session } = await requireSession();
  const id = formText(formData, "id");
  if (!isId(id)) return { ok: false, reason: "not-found" };
  const result = deletePlayer(deps, session, id);
  revalidatePlayerLists();
  return result;
}
