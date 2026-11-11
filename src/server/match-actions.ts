"use server";

import { redirect } from "next/navigation";
import type { Dart, InvalidInput } from "@/domain/game";
import {
  cancelMatch,
  commitVisit,
  createMatch,
  decideWinner,
  loadMatchView,
  restartMatch,
  setPlayOut,
  setStarter,
  reorder,
  undoVisit,
  type ActionError,
  type ActionResult,
} from "./match-service";
import { newInMatch, type NewAchievements } from "./achievement-service";
import { log } from "./log";
import { requireSession } from "./request";
import { invalidInput, isId, newMatchFromForm, undoStepSchema, visitPositionSchema } from "./action-input";

const notFound = { ok: false, reason: "not-found" } as const;

export async function createMatchAction(formData: FormData): Promise<InvalidInput> {
  const { deps, session } = await requireSession();
  const input = newMatchFromForm(formData, session.playerId);
  if (!input.ok) return input;
  const id = createMatch(deps, input.value);
  redirect(`/match/${id}`);
}

export async function commitVisitAction(matchId: string, legIndex: number, seq: number, darts: Dart[]): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  if (!isId(matchId)) return notFound;
  if (!visitPositionSchema.safeParse({ legIndex, seq }).success) return invalidInput;
  return commitVisit(deps, session, matchId, legIndex, seq, darts);
}

export async function setPlayOutAction(matchId: string, playOut: boolean): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  if (!isId(matchId)) return notFound;
  if (typeof playOut !== "boolean") return invalidInput;
  return setPlayOut(deps, session, matchId, playOut);
}

export async function decideWinnerAction(matchId: string, playerId: string): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  if (!isId(matchId)) return notFound;
  if (!isId(playerId)) return invalidInput;
  return decideWinner(deps, session, matchId, playerId);
}

export async function setStarterAction(matchId: string, playerId: string): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  if (!isId(matchId)) return notFound;
  if (!isId(playerId)) return invalidInput;
  return setStarter(deps, session, matchId, playerId);
}

/** 11.11.2026: new throwing order before the first dart (player ids in their new order). */
export async function reorderPlayersAction(matchId: string, order: string[]): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  if (!isId(matchId)) return notFound;
  if (!Array.isArray(order) || order.length > 50 || !order.every(isId)) return invalidInput;
  return reorder(deps, session, matchId, order);
}

export async function undoVisitAction(matchId: string, step?: string): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  if (!isId(matchId)) return notFound;
  if (!undoStepSchema.safeParse(step).success) return invalidInput;
  return undoVisit(deps, session, matchId, step);
}

export async function loadMatchAction(matchId: string): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  const view = isId(matchId) ? loadMatchView(deps, matchId, session) : null;
  return view ? { ok: true, view } : notFound;
}

export async function restartMatchAction(matchId: string): Promise<void> {
  const { deps, session } = await requireSession();
  const r = isId(matchId) ? restartMatch(deps, session, matchId) : notFound;
  redirect(r.ok ? `/match/${r.value}` : "/");
}

export async function cancelMatchAction(matchId: string): Promise<{ ok: true } | { ok: false; reason: ActionError }> {
  const { deps, session } = await requireSession();
  if (!isId(matchId)) return notFound;
  const r = cancelMatch(deps, session, matchId);
  if (r.ok) {
    log.info("match.cancelled", { match: matchId, by: session.name });
    redirect("/");
  }
  return r;
}

/** M10: the victory screen's banner, what the finished game brought each player that is new. */
export async function newAchievementsAction(matchId: string): Promise<NewAchievements[]> {
  const { deps } = await requireSession();
  return isId(matchId) ? newInMatch(deps, matchId) : [];
}
