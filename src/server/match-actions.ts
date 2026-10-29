"use server";

import { redirect } from "next/navigation";
import type { Dart } from "@/domain/game";
import { cancelMatch, commitVisit, createMatch, loadMatchView, restartMatch, setPlayOut, setStarter, undoVisit, type ActionError, type ActionResult } from "./match-service";
import { log } from "./log";
import { requireSession } from "./request";

/** The pills offer "best of" 1/3/5 (legacy labels); stored is how many are needed to win. */
const toWin = (bestOf: FormDataEntryValue | null) => Math.ceil((Number(bestOf) || 1) / 2);

export async function createMatchAction(formData: FormData): Promise<void> {
  const { deps, session } = await requireSession();
  const id = createMatch(deps, {
    playerIds: formData.getAll("playerId").map(String),
    rules: {
      startScore: Number(formData.get("startScore")),
      inRule: String(formData.get("inRule")) as "single" | "double" | "triple",
      outRule: String(formData.get("outRule")) as "single" | "double" | "triple",
    },
    format: { legsToWinSet: toWin(formData.get("legsToWinSet")), setsToWinMatch: toWin(formData.get("setsToWinMatch")) },
    starterIndex: 0,
    inputMode: formData.get("inputMode") === "per-player" ? "per-player" : "single",
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

export async function setStarterAction(matchId: string, playerId: string): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  return setStarter(deps, session, matchId, playerId);
}

export async function undoVisitAction(matchId: string): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  return undoVisit(deps, session, matchId);
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
