import type { ReactNode } from "react";
import { CricketTable, CricketTurn } from "@/components/darts/cricket-table";
import { nextPlayerText } from "@/components/darts/hint-text";
import { KeypadArea } from "@/components/darts/keypad-area";
import { ScoreGrid } from "@/components/darts/score-grid";
import type { PlayerId, ScoreboardView } from "@/domain/game";
import type { Texts } from "@/i18n/de";

type Props = {
  board: ScoreboardView;
  texts: Texts["game"];
  header: ReactNode;
  keypad: ReactNode;
  isOpen: boolean;
  /** Whose turn it is on a device that may not enter, or "match closed"; replaces the next player line. */
  turnHint: string | null;
  onSelectStarter?: (playerId: PlayerId) => void;
  /** 11.11.2026: 3+ players before the first dart: hold a column head and drag. */
  onReorder?: (order: PlayerId[]) => void;
};

/**
 * Cricket scoring screen in the Figma layout (Design/CricketGameInProgress*.png): the table instead of
 * panels, the player on turn with the visit's slots, the smaller keypad, the next player below it.
 */
export function CricketBoard({ board, texts, header, keypad, isOpen, turnHint, onSelectStarter, onReorder }: Props) {
  const active = board.players.find((p) => p.id === board.activePlayerId);
  return (
    <ScoreGrid
      header={header}
      panels={
        <div className="h-full bg-bg-grouped px-3 py-2">
          <CricketTable
            players={board.players}
            activePlayerId={board.activePlayerId}
            texts={texts}
            onSelect={onSelectStarter}
            onReorder={onReorder}
          />
        </div>
      }
      hint={<CricketTurn title={isOpen ? (active?.name ?? "") : texts.closed} player={active} visitLabel={texts.visit} />}
      keypad={<KeypadArea keypad={keypad} note={turnHint ?? nextPlayerText(board, texts)} />}
    />
  );
}
