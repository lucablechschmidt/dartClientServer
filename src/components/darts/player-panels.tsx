import type { ReactNode } from "react";
import type { PlayerPanelData } from "@/domain/game";
import { PlayerPanel, type PlayerPanelTexts } from "./player-panel";

type Props = {
  players: PlayerPanelData[];
  texts: PlayerPanelTexts;
  /** ToStart (M5): set before the first dart of a leg; tapping a panel makes that player start. Its name is the panel's text. */
  onSelect?: (playerId: string) => void;
};

/** Port of ClassicGameInProgressView + MultiplayerView: ≤2 players large and stacked, ≥3 the active one large + a row of small ones. As in legacy, panels are as tall as their content. */
export function PlayerPanels({ players, texts, onSelect }: Props) {
  const tappable = (p: PlayerPanelData, panel: ReactNode) =>
    onSelect ? (
      <button key={p.id} type="button" onClick={() => onSelect(p.id)} aria-pressed={p.isActive} className="text-left">
        {panel}
      </button>
    ) : (
      <div key={p.id}>{panel}</div>
    );
  if (players.length <= 2) {
    return <div className="grid content-start gap-2">{players.map((p) => tappable(p, <PlayerPanel player={p} texts={texts} />))}</div>;
  }
  const active = players.find((p) => p.isActive) ?? players[0];
  return (
    <div className="grid content-start gap-2">
      <PlayerPanel player={active} texts={texts} />
      <div className="flex gap-2 overflow-x-auto px-0.5 pb-1">
        {players.map((p) => tappable(p, <PlayerPanel player={p} size="small" texts={texts} />))}
      </div>
    </div>
  );
}
