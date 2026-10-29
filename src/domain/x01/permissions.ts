import { currentPlayer } from "./selectors";
import type { LegState, PlayerId } from "./types";

/**
 * Input permissions (E13, M4): pure functions over values, no DB.
 * `single`: only the host's device enters. `per-player`: the player on turn on their own device,
 * players without login (guests) via the host. Without a host (data from before M4) only an admin may.
 * A match is open while it is running and younger than 24 h; otherwise it counts as closed.
 */
export type InputMode = "single" | "per-player";

export type MatchAccess = {
  status: "running" | "finished" | "abandoned";
  startedAt: number;
  inputMode: InputMode;
  hostPlayerId: PlayerId | null;
  players: { id: PlayerId; hasLogin: boolean }[];
};

export type Actor = { id: PlayerId; isAdmin: boolean };

export const MATCH_OPEN_MS = 24 * 60 * 60 * 1000;

export function isOpen(match: Pick<MatchAccess, "status" | "startedAt">, now: number): boolean {
  return match.status === "running" && now - match.startedAt < MATCH_OPEN_MS;
}

/** Still changeable: not cancelled and younger than 24 h. A freshly finished match still allows undoing the winning dart. */
export function isEditable(match: Pick<MatchAccess, "status" | "startedAt">, now: number): boolean {
  return match.status !== "abandoned" && now - match.startedAt < MATCH_OPEN_MS;
}

const isHost = (match: MatchAccess, actor: Actor): boolean =>
  match.hostPlayerId === null ? actor.isAdmin : actor.id === match.hostPlayerId;

/** May `actor` enter for `playerId`? */
function mayActFor(match: MatchAccess, actor: Actor, playerId: PlayerId): boolean {
  if (match.inputMode === "single") return isHost(match, actor);
  const player = match.players.find((p) => p.id === playerId);
  if (!player) return false;
  return player.hasLogin ? actor.id === playerId : isHost(match, actor);
}

/** Enter the next visit, without checking the clock (for the client, which gets `isOpen` from the server). */
export function mayEnter(state: LegState, match: MatchAccess, actor: Actor): boolean {
  return mayActFor(match, actor, currentPlayer(state));
}

/** Undo the last saved visit: whoever could have entered it. */
export function mayUndo(state: LegState, match: MatchAccess, actor: Actor): boolean {
  const last = state.visits.at(-1);
  return last ? mayActFor(match, actor, last.playerId) : false;
}

export function canEnter(state: LegState, match: MatchAccess, actor: Actor, now: number): boolean {
  return isOpen(match, now) && mayEnter(state, match, actor);
}

export function canUndo(state: LegState, match: MatchAccess, actor: Actor, now: number): boolean {
  return isEditable(match, now) && mayUndo(state, match, actor);
}

/** Cancel: host or admin, only while the match is open. */
export function canCancel(match: MatchAccess, actor: Actor, now: number): boolean {
  return isOpen(match, now) && (actor.isAdmin || actor.id === match.hostPlayerId);
}
