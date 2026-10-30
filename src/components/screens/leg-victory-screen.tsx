import { useState } from "react";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import type { MatchBoardView, PlayerId } from "@/domain/game";
import type { Texts } from "@/i18n/de";

type Props = {
  view: MatchBoardView;
  names: Record<PlayerId, string>;
  texts: Texts["game"];
  canUndo: boolean;
  onContinue: () => void;
  onUndo: () => void;
  /** M9, tournament fixtures: declare the winner now (when time runs short); absent where not allowed. */
  onDecide?: (playerId: PlayerId) => void;
};

/** "Legs 1:0 · Sets 0:0" for the header and the victory screens; null when only one leg is played. */
export function scoreLine(view: MatchBoardView, players: PlayerId[], texts: { legs: string; sets: string }): string | null {
  if (!view.score) return null;
  const pair = (r: Record<PlayerId, number>) => players.map((p) => r[p]).join(":");
  return [view.score.legs && `${texts.legs} ${pair(view.score.legs)}`, view.score.sets && `${texts.sets} ${pair(view.score.sets)}`]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Port of LegVictoryView (M5 plan §9.3): a leg is over, the match is not. A tap anywhere goes on to
 * the next leg; only the undo button takes the last dart back instead.
 */
export function LegVictoryScreen({ view, names, texts, canUndo, onContinue, onUndo, onDecide }: Props) {
  const winner = view.legWinnerId ? names[view.legWinnerId] : "";
  const players = view.board.players.map((p) => p.id);
  const [deciding, setDeciding] = useState(false);
  const [chosen, setChosen] = useState<PlayerId | null>(null);
  const pick = chosen ?? leader(view, players);
  return (
    <>
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
        <p className="text-fluid-xl font-semibold">{texts.legWon.replace("{name}", winner)}</p>
        <p className="text-fluid-lg tabular-nums">{scoreLine(view, players, texts)}</p>
        <p className="text-fluid-sm text-fg-muted">{texts.tapToContinue}</p>
        <button
          type="button"
          disabled={!canUndo}
          onClick={(e) => {
            e.stopPropagation();
            onUndo();
          }}
          className="min-h-touch w-full max-w-md rounded-tile border border-frame-fg px-4 font-medium disabled:opacity-50"
        >
          {texts.undoLastDart}
        </button>
        {onDecide && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeciding(true);
            }}
            className="min-h-touch w-full max-w-md rounded-tile border border-frame-fg px-4 font-medium"
          >
            {texts.decideWinner}
          </button>
        )}
      </div>
      <ConfirmSheet
        open={deciding}
        text={texts.decideWinnerQuestion}
        confirmLabel={texts.decideWinnerConfirm}
        cancelLabel={texts.cancelBack}
        onConfirm={() => {
          setDeciding(false);
          if (pick) onDecide?.(pick);
        }}
        onCancel={() => setDeciding(false)}
      >
        <div role="radiogroup" aria-label={texts.decideWinner} className="flex flex-col gap-2 pb-4">
          {players.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={id === pick}
              onClick={() => setChosen(id)}
              className={`min-h-touch rounded-tile border px-4 text-left font-medium ${id === pick ? "border-accent bg-accent-wash" : "border-separator"}`}
            >
              {names[id] ?? id}
            </button>
          ))}
        </div>
      </ConfirmSheet>
    </>
  );
}

/** Who leads on sets, then on legs; on a tie the winner of the leg just played (preselected when deciding). */
function leader(view: MatchBoardView, players: PlayerId[]): PlayerId | null {
  const score = (id: PlayerId) => [view.score?.sets?.[id] ?? 0, view.score?.legs?.[id] ?? 0] as const;
  const [first, second] = [...players].sort((a, b) => score(b)[0] - score(a)[0] || score(b)[1] - score(a)[1]);
  if (first && second && (score(first)[0] !== score(second)[0] || score(first)[1] !== score(second)[1])) return first;
  return view.legWinnerId;
}
