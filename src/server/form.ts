import type { z } from "zod";
import type { Result } from "@/domain/game";

/**
 * A text field of a submitted form. FormData fields can also be files, which would turn into
 * "[object File]" with String(); those and missing fields become the fallback.
 */
export function formText(formData: FormData, name: string, fallback = ""): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : fallback;
}

/** A field as sent, or undefined when missing, so a schema default applies and a file is rejected by the schema. */
export function formField(formData: FormData, name: string): FormDataEntryValue | undefined {
  return formData.get(name) ?? undefined;
}

/** All text values of a repeated field (e.g. the chosen players in throwing order). */
export function formTexts(formData: FormData, name: string): string[] {
  return formData.getAll(name).filter((v): v is string => typeof v === "string");
}

/**
 * A number field for a schema: missing stays undefined (so a schema default applies), anything
 * that is not a number becomes NaN (so the schema rejects it instead of reading 0).
 */
export function formNumber(formData: FormData, name: string): number | undefined {
  const value = formData.get(name);
  if (value === null) return undefined;
  return typeof value === "string" ? numberOf(value) : NaN;
}

/** The same for one value of a repeated field. */
export const numberOf = (value: string | undefined): number | undefined =>
  value === undefined ? undefined : value.trim() === "" ? NaN : Number(value);

/**
 * R-02 (m13-plan.md): actions check their input at the edge and answer with a Result; the
 * services get typed values. A failed schema is the user's input, not a bug, so nothing throws.
 */
export function validate<S extends z.ZodType>(schema: S, raw: unknown): Result<z.output<S>, "invalid-input"> {
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, reason: "invalid-input" };
}
