import type { MatchBoardView, PlayerId } from "@/domain/x01";
import type { Texts } from "@/i18n/de";

type Props = {
  view: MatchBoardView;
  names: Record<PlayerId, string>;
  texts: Texts["game"];
  canUndo: boolean;
  onContinue: () => void;
  onUndo: () => void;
};

/** "Legs 1:0 · Sets 0:0" for the header and the victory screens; null when only one leg is played. */
export function scoreLine(view: MatchBoardView, players: PlayerId[], texts: { legs: string; sets: string }): string | null {
  if (!view.score) return null;
  const pair = (r: Record<PlayerId, number>) => players.map((p) => r[p]).join(":");
  return [view.score.legs && `${texts.legs} ${pair(view.score.legs)}`, view.score.sets && `${texts.sets} ${pair(view.score.sets)}`].filter(Boolean).join(" · ");
}

/**
 * Port of LegVictoryView (M5 plan §9.3): a leg is over, the match is not. A tap anywhere goes on to
 * the next leg; only the undo button takes the last dart back instead.
 */
export function LegVictoryScreen({ view, names, texts, canUndo, onContinue, onUndo }: Props) {
  const winner = view.legWinnerId ? names[view.legWinnerId] : "";
  const players = view.board.players.map((p) => p.id);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={texts.tapToContinue}
      onClick={onContinue}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onContinue();
      }}
      className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-bg px-4 pt-safe pb-safe text-fg"
    >
      <p className="fluid-text-xl font-semibold">{texts.legWon.replace("{name}", winner)}</p>
      <p className="fluid-text-lg tabular">{scoreLine(view, players, texts)}</p>
      <p className="fluid-text-sm text-fg-muted">{texts.tapToContinue}</p>
      <button
        type="button"
        disabled={!canUndo}
        onClick={(e) => {
          e.stopPropagation();
          onUndo();
        }}
        className="min-h-touch w-full max-w-md rounded-xl border border-frame-fg px-4 font-medium disabled:opacity-50"
      >
        {texts.undoLastDart}
      </button>
    </div>
  );
}
