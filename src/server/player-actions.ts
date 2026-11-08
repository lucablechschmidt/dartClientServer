"use server";

import { revalidatePath } from "next/cache";
import type { GuestResult, PlayerResult } from "@/domain/player";
import { createGuest, createPlayer, deletePlayer, renamePlayer } from "./player-service";
import { requireSession } from "./request";
import { formText } from "./form";
import { isId } from "./action-input";

const touched = () => {
  revalidatePath("/admin");
  revalidatePath("/players");
  revalidatePath("/new/x01");
};

export async function createPlayerAction(formData: FormData): Promise<PlayerResult> {
  const { deps } = await requireSession();
  const r = createPlayer(deps, formText(formData, "name"));
  touched();
  return r.ok ? { ok: true } : r;
}

export async function renamePlayerAction(formData: FormData): Promise<PlayerResult> {
  const { deps, session } = await requireSession();
  const id = formText(formData, "id");
  if (!isId(id)) return { ok: false, reason: "not-found" };
  const r = renamePlayer(deps, session, id, formText(formData, "name"));
  touched();
  return r;
}

/** E12: guest for the evening; returns the id so the setup can select them right away. */
export async function createGuestAction(formData: FormData): Promise<GuestResult> {
  const { deps } = await requireSession();
  const r = createGuest(deps, formText(formData, "name"));
  touched();
  return r.ok ? { ok: true, id: r.player.id } : r;
}

export async function deletePlayerAction(formData: FormData): Promise<PlayerResult> {
  const { deps, session } = await requireSession();
  const id = formText(formData, "id");
  if (!isId(id)) return { ok: false, reason: "not-found" };
  const result = deletePlayer(deps, session, id);
  touched();
  return result;
}
