import type { ReactNode } from "react";
import { CricketTable, CricketTurn } from "@/components/darts/cricket-table";
import { ScoreGrid } from "@/components/darts/score-grid";
import type { PlayerId, ScoreboardView } from "@/domain/game";
import type { Texts } from "@/i18n/de";

type Props = {
  board: ScoreboardView;
  names: Record<PlayerId, string>;
  texts: Texts["game"];
  header: ReactNode;
  keypad: ReactNode;
  isOpen: boolean;
  /** Whose turn it is on a device that may not enter, or "match closed"; replaces the next player line. */
  turnHint: string | null;
  onSelectStarter?: (playerId: PlayerId) => void;
};

/**
 * Cricket scoring screen in the Figma layout (Design/CricketGameInProgress*.png): the table instead of
 * panels, the player on turn with the visit's slots, the smaller keypad, the next player below it.
 */
export function CricketBoard({ board, names, texts, header, keypad, isOpen, turnHint, onSelectStarter }: Props) {
  const active = board.players.find((p) => p.id === board.activePlayerId);
  const next = board.nextPlayerId ? texts.nextPlayer.replace("{name}", names[board.nextPlayerId] ?? "") : "";
  return (
    <ScoreGrid
      header={header}
      panels={
        <div className="h-full bg-bg-grouped px-3 py-2">
          <CricketTable players={board.players} activePlayerId={board.activePlayerId} texts={texts} onSelect={onSelectStarter} />
        </div>
      }
      hint={<CricketTurn title={isOpen ? (active?.name ?? "") : texts.closed} player={active} visitLabel={texts.visit} />}
      keypad={
        <div className="flex h-full flex-col gap-2 px-3 pb-3">
          <div className="min-h-0 flex-1">{keypad}</div>
          <p className="text-center fluid-text-sm text-fg-muted">{turnHint ?? next}</p>
        </div>
      }
    />
  );
}
