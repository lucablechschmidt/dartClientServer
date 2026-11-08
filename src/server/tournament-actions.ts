"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InvalidInput } from "@/domain/game";
import { isId, newTournamentFromForm } from "./action-input";
import { requireSession } from "./request";
import { createTournament, deleteTournament, redrawTournament, startFixture, type TournamentError } from "./tournament-service";

const notFound = { ok: false, reason: "not-found" } as const;

export async function createTournamentAction(formData: FormData): Promise<InvalidInput> {
  const { deps, session } = await requireSession();
  const input = newTournamentFromForm(formData);
  if (!input.ok) return input;
  const id = createTournament(deps, session, input.value);
  redirect(`/tournaments/${id}`);
}

export async function startFixtureAction(tournamentId: string, fixtureId: string): Promise<{ ok: false; reason: TournamentError }> {
  const { deps, session } = await requireSession();
  if (!isId(tournamentId) || !isId(fixtureId)) return notFound;
  const r = startFixture(deps, session, tournamentId, fixtureId);
  if (r.ok) redirect(`/match/${r.matchId}`);
  return r;
}

export async function redrawTournamentAction(tournamentId: string): Promise<{ ok: true } | { ok: false; reason: TournamentError }> {
  const { deps, session } = await requireSession();
  if (!isId(tournamentId)) return notFound;
  const r = redrawTournament(deps, session, tournamentId);
  // Without this the new draw is stored but the page keeps showing the old bracket or groups.
  if (r.ok) revalidatePath(`/tournaments/${tournamentId}`);
  return r;
}

export async function deleteTournamentAction(tournamentId: string): Promise<{ ok: false; reason: TournamentError }> {
  const { deps, session } = await requireSession();
  if (!isId(tournamentId)) return notFound;
  const r = deleteTournament(deps, session, tournamentId);
  if (r.ok) redirect("/tournaments");
  return r;
}
