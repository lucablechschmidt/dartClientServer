"use server";

import { redirect } from "next/navigation";
import { MODE_IDS, type Dart, type ModeId } from "@/domain/game";
import {
  cancelMatch,
  commitVisit,
  createMatch,
  decideWinner,
  loadMatchView,
  restartMatch,
  setPlayOut,
  setStarter,
  undoVisit,
  type ActionError,
  type ActionResult,
} from "./match-service";
import { log } from "./log";
import { requireSession } from "./request";
import { formText, formTexts } from "./form";

/** The pills offer "best of" 1/3/5 (legacy labels); stored is how many are needed to win. */
const toWin = (bestOf: string) => Math.ceil((Number(bestOf) || 1) / 2);

export async function createMatchAction(formData: FormData): Promise<void> {
  const { deps, session } = await requireSession();
  const mode = formText(formData, "mode", "x01");
  const id = createMatch(deps, {
    mode: (MODE_IDS as readonly string[]).includes(mode) ? (mode as ModeId) : "x01",
    playerIds: formTexts(formData, "playerId"),
    rules: {
      startScore: Number(formText(formData, "startScore")),
      inRule: formText(formData, "inRule") as "single" | "double" | "triple",
      outRule: formText(formData, "outRule") as "single" | "double" | "triple",
    },
    format: { legsToWinSet: toWin(formText(formData, "legsToWinSet")), setsToWinMatch: toWin(formText(formData, "setsToWinMatch")) },
    starterIndex: 0,
    inputMode: formText(formData, "inputMode") === "per-player" ? "per-player" : "single",
    hostPlayerId: session.playerId,
  });
  redirect(`/match/${id}`);
}

export async function commitVisitAction(matchId: string, legIndex: number, seq: number, darts: Dart[]): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  return commitVisit(deps, session, matchId, legIndex, seq, darts);
}

export async function setPlayOutAction(matchId: string, playOut: boolean): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  return setPlayOut(deps, session, matchId, playOut);
}

export async function decideWinnerAction(matchId: string, playerId: string): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  return decideWinner(deps, session, matchId, playerId);
}

export async function setStarterAction(matchId: string, playerId: string): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  return setStarter(deps, session, matchId, playerId);
}

export async function undoVisitAction(matchId: string, step?: string): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  return undoVisit(deps, session, matchId, step);
}

export async function loadMatchAction(matchId: string): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  const view = loadMatchView(deps, matchId, session);
  return view ? { ok: true, view } : { ok: false, reason: "not-found" };
}

export async function restartMatchAction(matchId: string): Promise<void> {
  const { deps } = await requireSession();
  const id = restartMatch(deps, matchId);
  redirect(id ? `/match/${id}` : "/");
}

export async function cancelMatchAction(matchId: string): Promise<{ ok: true } | { ok: false; reason: ActionError }> {
  const { deps, session } = await requireSession();
  const r = cancelMatch(deps, session, matchId);
  if (r.ok) {
    log.info("match.cancelled", { match: matchId, by: session.name });
    redirect("/");
  }
  return r;
}
