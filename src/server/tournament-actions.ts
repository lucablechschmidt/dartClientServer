"use server";

import { redirect } from "next/navigation";
import { TOURNAMENT_FORMATS, type TournamentFormat } from "@/domain/tournament";
import { formText, formTexts } from "./form";
import { requireSession } from "./request";
import { createTournament, deleteTournament, redrawTournament, startFixture, type TournamentError } from "./tournament-service";

/** Best of n (the steppers) to the number of legs or sets that win. */
const toWin = (bestOf: string) => Math.ceil((Number(bestOf) || 1) / 2);
const ruleOf = (v: string) => (v === "double" || v === "triple" ? v : "single");

export async function createTournamentAction(formData: FormData): Promise<void> {
  const { deps, session } = await requireSession();
  const format = formText(formData, "format");
  const knockoutLegs = formTexts(formData, "knockoutLegs");
  const knockoutSets = formTexts(formData, "knockoutSets");
  const id = createTournament(deps, session, {
    name: formText(formData, "name"),
    format: (TOURNAMENT_FORMATS as readonly string[]).includes(format) ? (format as TournamentFormat) : "round-robin",
    playerIds: formTexts(formData, "playerId"),
    groups: Number(formText(formData, "groups", "1")),
    advance: Number(formText(formData, "advance", "2")) as 1 | 2 | 4,
    rules: {
      startScore: Number(formText(formData, "startScore", "501")),
      inRule: ruleOf(formText(formData, "inRule")),
      outRule: ruleOf(formText(formData, "outRule", "double")),
    },
    inputMode: formText(formData, "inputMode") === "per-player" ? "per-player" : "single",
    groupFormat: { legsToWinSet: toWin(formText(formData, "groupLegs")), setsToWinMatch: toWin(formText(formData, "groupSets")) },
    knockoutFormats: knockoutLegs.map((legs, i) => ({ legsToWinSet: toWin(legs), setsToWinMatch: toWin(knockoutSets.at(i) ?? "1") })),
  });
  redirect(`/tournaments/${id}`);
}

export async function startFixtureAction(tournamentId: string, fixtureId: string): Promise<{ ok: false; reason: TournamentError }> {
  const { deps, session } = await requireSession();
  const r = startFixture(deps, session, tournamentId, fixtureId);
  if (r.ok) redirect(`/match/${r.matchId}`);
  return r;
}

export async function redrawTournamentAction(tournamentId: string): Promise<{ ok: true } | { ok: false; reason: TournamentError }> {
  const { deps, session } = await requireSession();
  return redrawTournament(deps, session, tournamentId);
}

export async function deleteTournamentAction(tournamentId: string): Promise<{ ok: false; reason: TournamentError }> {
  const { deps, session } = await requireSession();
  const r = deleteTournament(deps, session, tournamentId);
  if (r.ok) redirect("/tournaments");
  return r;
}
