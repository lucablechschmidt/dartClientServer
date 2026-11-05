import type { BoardHint, ScoreboardView } from "@/domain/game";
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
    case "gap":
      return texts.hints.gap.replace("{n}", String(hint.points));
    case "target":
      return texts.hints.target.replace("{target}", (texts.hints.targets as Record<string, string>)[hint.target] ?? hint.target);
  }
}

/** "Nächster Spieler: …" for the line below the keypad; empty when nobody follows (leg over, play-out alone). */
export function nextPlayerText(board: Pick<ScoreboardView, "nextPlayerId" | "players">, texts: Pick<Texts["game"], "nextPlayer">): string {
  const next = board.players.find((p) => p.id === board.nextPlayerId);
  return next ? texts.nextPlayer.replace("{name}", next.name) : "";
}
