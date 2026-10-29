"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import type { PlayerResult } from "@/domain/player";
import { promoteGuest } from "./admin-service";
import { readEnv } from "./env";
import { createPasswordInvite, createRegisterInvite } from "./invite-service";
import { requireAdmin } from "./request";

export type InviteLink = { url: string; svg: string };

async function link(token: string): Promise<InviteLink> {
  const url = `${readEnv().appUrl}/einladung/${token}`;
  return { url, svg: await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }) };
}

const touched = () => {
  revalidatePath("/account");
  revalidatePath("/players");
  revalidatePath("/new/x01");
};

export async function createRegisterInviteAction(): Promise<InviteLink> {
  const { deps } = await requireAdmin();
  return link(createRegisterInvite(deps));
}

/** Create a login (player without login) or reset (player with login, ends their sessions). */
export async function createPasswordInviteAction(playerId: string): Promise<InviteLink | null> {
  const { deps } = await requireAdmin();
  const player = deps.players.findPlayerById(playerId);
  if (!player) return null;
  const token = createPasswordInvite(deps, playerId, player.hasLogin);
  return token ? link(token) : null;
}

export async function promoteGuestAction(playerId: string): Promise<PlayerResult> {
  const { deps, session } = await requireAdmin();
  const r = promoteGuest(deps, session, playerId);
  touched();
  return r;
}
