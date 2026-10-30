import { z } from "zod";
import type { NewPlayer, Player } from "@/db/repository";
import { GUEST_LIFETIME_MS, isGuest, type PlayerResult, type Session } from "@/domain/player";
import type { Deps } from "./deps";

export const playerNameSchema = z.string().trim().min(1).max(40);

export function listPlayers(deps: Deps): Player[] {
  return deps.players.listPlayers(deps.now());
}

type CreateResult = { ok: true; player: Player } | { ok: false; reason: "name-taken" };

/** Names are unique across all players (case-insensitive), guests included; `exceptId` when renaming. */
function nameTaken(deps: Deps, name: string, exceptId?: string): boolean {
  const other = deps.players.findPlayerByName(name);
  return other !== null && other.id !== exceptId;
}

/** The player just inserted in this transaction; missing would be a bug in the repository. */
function created(deps: Deps, id: string): Player {
  const player = deps.players.findPlayerById(id);
  if (!player) throw new Error(`player ${id} missing right after insert`);
  return player;
}

export function createPlayer(deps: Deps, rawName: string): CreateResult {
  const name = playerNameSchema.parse(rawName);
  return deps.transaction((): CreateResult => {
    if (nameTaken(deps, name)) return { ok: false, reason: "name-taken" };
    const player: NewPlayer = { id: deps.newId(), name, createdAt: deps.now(), guestUntil: null };
    deps.players.createPlayer(player);
    return { ok: true, player: created(deps, player.id) };
  });
}

/** E12: guest for tonight; visible in the setup screens for 24 h, then cleaned up together with their matches. */
export function createGuest(deps: Deps, rawName: string): CreateResult {
  const name = playerNameSchema.parse(rawName);
  return deps.transaction((): CreateResult => {
    if (nameTaken(deps, name)) return { ok: false, reason: "name-taken" };
    const now = deps.now();
    const player: NewPlayer = { id: deps.newId(), name, createdAt: now, guestUntil: now + GUEST_LIFETIME_MS };
    deps.players.createPlayer(player);
    return { ok: true, player: created(deps, player.id) };
  });
}

/** Permissions (E10): the admin everyone, otherwise only oneself and guests. */
export function renamePlayer(deps: Deps, session: Session, id: string, rawName: string): PlayerResult {
  const player = deps.players.findPlayerById(id);
  if (!player) return { ok: false, reason: "not-found" };
  if (!session.isAdmin && session.playerId !== id && !isGuest(player)) return { ok: false, reason: "forbidden" };
  const name = playerNameSchema.parse(rawName);
  return deps.transaction((): PlayerResult => {
    if (nameTaken(deps, name, id)) return { ok: false, reason: "name-taken" };
    deps.players.renamePlayer(id, name);
    return { ok: true };
  });
}

/** Anyone may remove guests; regular players only the admin, never oneself or other admins. */
export function deletePlayer(deps: Deps, session: Session, id: string): PlayerResult {
  const player = deps.players.findPlayerById(id);
  if (!player) return { ok: false, reason: "not-found" };
  if (!isGuest(player) && (!session.isAdmin || player.isAdmin || session.playerId === id)) return { ok: false, reason: "forbidden" };
  return deps.transaction(() => deps.players.deletePlayer(id)) === "deleted" ? { ok: true } : { ok: false, reason: "player-in-match" };
}
