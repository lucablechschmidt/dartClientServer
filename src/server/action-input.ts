import { z } from "zod";
import type { InvalidInput, Result } from "@/domain/game";
import { formField, formNumber, formTexts, numberOf, validate } from "./form";
import { newMatchSchema } from "./match-service";
import { newTournamentSchema } from "./tournament-service";

/**
 * R-02/R-32 (m13-plan.md): what the actions take from forms and from the client, checked before a
 * service sees it. Services keep their own schemas for callers inside the server.
 */

/** The steppers offer "best of" n (legacy labels); stored is how many legs or sets win. Missing means best of 1. */
const toWin = (bestOf: number | undefined) => Math.ceil((bestOf ?? 1) / 2);

export function newMatchFromForm(formData: FormData, hostPlayerId: string): Result<z.output<typeof newMatchSchema>, "invalid-input"> {
  return validate(newMatchSchema, {
    mode: formField(formData, "mode"),
    playerIds: formTexts(formData, "playerId"),
    rules: {
      startScore: formNumber(formData, "startScore"),
      inRule: formField(formData, "inRule"),
      outRule: formField(formData, "outRule"),
    },
    format: { legsToWinSet: toWin(formNumber(formData, "legsToWinSet")), setsToWinMatch: toWin(formNumber(formData, "setsToWinMatch")) },
    starterIndex: 0,
    inputMode: formField(formData, "inputMode"),
    hostPlayerId,
  });
}

export function newTournamentFromForm(formData: FormData): Result<z.output<typeof newTournamentSchema>, "invalid-input"> {
  const knockoutSets = formTexts(formData, "knockoutSets");
  return validate(newTournamentSchema, {
    name: formField(formData, "name"),
    format: formField(formData, "format"),
    playerIds: formTexts(formData, "playerId"),
    groups: formNumber(formData, "groups"),
    advance: formNumber(formData, "advance"),
    rules: {
      startScore: formNumber(formData, "startScore"),
      inRule: formField(formData, "inRule") ?? "single",
      outRule: formField(formData, "outRule") ?? "double",
    },
    inputMode: formField(formData, "inputMode"),
    seeding: formField(formData, "seeding"),
    groupFormat: { legsToWinSet: toWin(formNumber(formData, "groupLegs")), setsToWinMatch: toWin(formNumber(formData, "groupSets")) },
    knockoutFormats: formTexts(formData, "knockoutLegs").map((legs, i) => ({
      legsToWinSet: toWin(numberOf(legs)),
      setsToWinMatch: toWin(numberOf(knockoutSets.at(i))),
    })),
  });
}

/** Ids come from our own pages; anything else cannot exist and is answered as not found. */
export const idSchema = z.string().min(1).max(100);
export const isId = (v: unknown): v is string => idSchema.safeParse(v).success;

/** Position of a visit the client wants to save (M6 idempotency). */
export const visitPositionSchema = z.object({ legIndex: z.number().int().min(0), seq: z.number().int().min(0) });
/** Undo step token, absent for a plain undo. */
export const undoStepSchema = z.string().max(200).optional();
/** Paging offset of the admin's game list. */
export const offsetSchema = z.number().int().min(0);

export const invalidInput: InvalidInput = { ok: false, reason: "invalid-input" };
