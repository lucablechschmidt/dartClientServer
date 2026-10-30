import type { ReactNode } from "react";
import { CheckoutHint } from "@/components/darts/checkout-hint";
import { hintText } from "@/components/darts/hint-text";
import { PlayerPanels } from "@/components/darts/player-panels";
import { ScoreGrid } from "@/components/darts/score-grid";
import { TextButton } from "@/components/ui/form-controls";
import type { PlayerId, ScoreboardView } from "@/domain/game";
import type { Texts } from "@/i18n/de";

type Props = {
  board: ScoreboardView;
  texts: Texts["game"];
  header: ReactNode;
  keypad: ReactNode;
  /** Whose turn it is on a device that may not enter, "match closed", or the ToStart hint; replaces the mode's hint. */
  turnHint: string | null;
  onSelectStarter?: (playerId: PlayerId) => void;
  /** X01 play-out (M5): the last player may give up. */
  onResign: (() => void) | null;
};

/** Scoring screen of X01, Elimination and SplitScore: player panels, the hint line, the legacy keypad. */
export function StandardBoard({ board, texts, header, keypad, turnHint, onSelectStarter, onResign }: Props) {
  return (
    <ScoreGrid
      header={header}
      panels={
        <div className="h-full px-3">
          <PlayerPanels
            players={board.players}
            texts={{ darts: texts.darts, average: texts.average, visit: texts.visit }}
            onSelect={onSelectStarter}
            selectLabel={texts.toStart}
          />
        </div>
      }
      hint={
        <div className="flex items-center gap-2 px-3">
          <div className="flex-1">
            <CheckoutHint hint={turnHint ?? hintText(board.hint, texts)} />
          </div>
          {onResign && (
            <TextButton tone="danger" onClick={onResign}>
              {texts.resign}
            </TextButton>
          )}
        </div>
      }
      keypad={<div className="h-full px-3 pb-3">{keypad}</div>}
    />
  );
}
