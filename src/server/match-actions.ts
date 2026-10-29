"use server";

import { redirect } from "next/navigation";
import type { Dart } from "@/domain/x01";
import { cancelMatch, commitVisit, createMatch, loadMatchView, restartMatch, undoVisit, type ActionError, type ActionResult } from "./match-service";
import { log } from "./log";
import { requireSession } from "./request";

export async function createMatchAction(formData: FormData): Promise<void> {
  const { deps, session } = await requireSession();
  const id = createMatch(deps, {
    playerIds: formData.getAll("playerId").map(String),
    rules: {
      startScore: Number(formData.get("startScore")),
      inRule: String(formData.get("inRule")) as "single" | "double" | "triple",
      outRule: String(formData.get("outRule")) as "single" | "double" | "triple",
    },
    starterIndex: 0,
    inputMode: formData.get("inputMode") === "per-player" ? "per-player" : "single",
    hostPlayerId: session.playerId,
  });
  redirect(`/match/${id}`);
}

export async function commitVisitAction(matchId: string, seq: number, darts: Dart[]): Promise<ActionResult> {
  const { deps, session } = await requireSession();
  return commitVisit(deps, session, matchId, seq, darts);
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
