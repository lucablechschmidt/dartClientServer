"use server";

import { revalidatePath } from "next/cache";
import type { PlayerResult } from "@/domain/player";
import { createGuest, createPlayer, deletePlayer, renamePlayer } from "./player-service";
import { requireSession } from "./request";
import { formText } from "./form";

const touched = () => {
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
  const r = renamePlayer(deps, session, formText(formData, "id"), formText(formData, "name"));
  touched();
  return r;
}

/** E12: guest for the evening; returns the id so the setup can select them right away. */
export async function createGuestAction(formData: FormData): Promise<{ ok: true; id: string } | { ok: false; reason: "name-taken" }> {
  const { deps } = await requireSession();
  const r = createGuest(deps, formText(formData, "name"));
  touched();
  return r.ok ? { ok: true, id: r.player.id } : r;
}

export async function deletePlayerAction(formData: FormData): Promise<PlayerResult> {
  const { deps, session } = await requireSession();
  const result = deletePlayer(deps, session, formText(formData, "id"));
  touched();
  return result;
}
