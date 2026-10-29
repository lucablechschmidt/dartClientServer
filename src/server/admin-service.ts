import { isGuest, type PlayerResult, type Session } from "@/domain/player";
import type { Deps } from "./deps";

/** Admin actions (M3, §1 of the plan). The permission check lives here, not in the UI. */

const admin = (session: Session): PlayerResult | null => (session.isAdmin ? null : { ok: false, reason: "forbidden" });

/** E12: a guest becomes a regular player (without login; the admin creates one afterwards if needed). */
export function promoteGuest(deps: Deps, session: Session, playerId: string): PlayerResult {
  const denied = admin(session);
  if (denied) return denied;
  const player = deps.players.findPlayerById(playerId);
  if (!player) return { ok: false, reason: "not-found" };
  if (!isGuest(player)) return { ok: false, reason: "forbidden" };
  deps.players.promoteGuest(playerId);
  return { ok: true };
}
