"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import type { PlayerResult } from "@/domain/player";
import { promoteGuest } from "./admin-service";
import { deleteMatchAsAdmin, deleteTournamentWithMatches, listAllMatches, type AdminMatchItem, type CleanupError } from "./cleanup-service";
import { log } from "./log";
import { readEnv } from "./env";
import { createPasswordInvite, createRegisterInvite } from "./invite-service";
import { requireAdmin } from "./request";
import { revalidatePlayerLists } from "./revalidate";
import { isId, offsetSchema } from "./action-input";

export type InviteLink = { url: string; svg: string };

async function link(token: string): Promise<InviteLink> {
  const url = `${readEnv().appUrl}/einladung/${token}`;
  return { url, svg: await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }) };
}

/** After deleting games: the admin list, the overview with its history, the tournaments. */
const cleanedUp = () => {
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/tournaments");
};

export async function createRegisterInviteAction(): Promise<InviteLink> {
  const { deps } = await requireAdmin();
  return link(createRegisterInvite(deps));
}

/** Create a login (player without login) or reset (player with login, ends their sessions). */
export async function createPasswordInviteAction(playerId: string): Promise<InviteLink | null> {
  const { deps } = await requireAdmin();
  if (!isId(playerId)) return null;
  const player = deps.players.findPlayerById(playerId);
  if (!player) return null;
  const token = createPasswordInvite(deps, playerId, player.hasLogin);
  return token ? link(token) : null;
}

export async function promoteGuestAction(playerId: string): Promise<PlayerResult> {
  const { deps, session } = await requireAdmin();
  if (!isId(playerId)) return { ok: false, reason: "not-found" };
  const r = promoteGuest(deps, session, playerId);
  revalidatePlayerLists();
  return r;
}

/** Clean-up (tab "Verwaltung"): the game is gone from the overview, the history and every statistic. */
export async function deleteMatchAdminAction(matchId: string): Promise<{ ok: true } | { ok: false; reason: CleanupError }> {
  const { deps, session } = await requireAdmin();
  if (!isId(matchId)) return { ok: false, reason: "not-found" };
  const r = deleteMatchAsAdmin(deps, session, matchId);
  if (r.ok) log.info("admin.match-deleted", { match: matchId, by: session.name });
  cleanedUp();
  return r;
}

/** Clean-up: a tournament together with all its games. */
export async function deleteTournamentAdminAction(tournamentId: string): Promise<{ ok: true } | { ok: false; reason: CleanupError }> {
  const { deps, session } = await requireAdmin();
  if (!isId(tournamentId)) return { ok: false, reason: "not-found" };
  const r = deleteTournamentWithMatches(deps, session, tournamentId);
  if (r.ok) log.info("admin.tournament-deleted", { tournament: tournamentId, by: session.name });
  cleanedUp();
  return r;
}

/** The next page of games for the clean-up list. */
export async function loadMoreMatchesAction(offset: number): Promise<{ items: AdminMatchItem[]; hasMore: boolean }> {
  const { deps, session } = await requireAdmin();
  if (!offsetSchema.safeParse(offset).success) return { items: [], hasMore: false };
  const r = listAllMatches(deps, session, offset);
  return r.ok ? { items: r.items, hasMore: r.hasMore } : { items: [], hasMore: false };
}
