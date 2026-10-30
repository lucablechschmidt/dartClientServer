/**
 * A text field of a submitted form. FormData fields can also be files, which would turn into
 * "[object File]" with String(); those and missing fields become the fallback.
 */
export function formText(formData: FormData, name: string, fallback = ""): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : fallback;
}

/** All text values of a repeated field (e.g. the chosen players in throwing order). */
export function formTexts(formData: FormData, name: string): string[] {
  return formData.getAll(name).filter((v): v is string => typeof v === "string");
}
