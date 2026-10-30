import type { BoardHint } from "@/domain/game";
import type { Texts } from "@/i18n/de";

type HintTexts = Pick<Texts["game"], "hints">;

/** The text of the hint line for every mode (M7); the domain says what, i18n says how. */
export function hintText(hint: BoardHint | null, texts: HintTexts): string | null {
  if (!hint) return null;
  switch (hint.kind) {
    case "checkout":
      return hint.text;
    case "elimination":
      return texts.hints.elimination.replace("{n}", String(hint.points));
    case "target":
      return texts.hints.target.replace("{target}", (texts.hints.targets as Record<string, string>)[hint.target] ?? hint.target);
  }
}
