import type { PlayerPanelData } from "@/domain/x01";
import { PlayerPanel, type PlayerPanelTexts } from "./player-panel";

/** Port of ClassicGameInProgressView + MultiplayerView: ≤2 players large and stacked, ≥3 the active one large + a row of small ones. As in legacy, panels are as tall as their content. */
export function PlayerPanels({ players, texts }: { players: PlayerPanelData[]; texts: PlayerPanelTexts }) {
  if (players.length <= 2) {
    return (
      <div className="grid content-start gap-2">
        {players.map((p) => <PlayerPanel key={p.id} player={p} texts={texts} />)}
      </div>
    );
  }
  const active = players.find((p) => p.isActive) ?? players[0];
  return (
    <div className="grid content-start gap-2">
      <PlayerPanel player={active} texts={texts} />
      <div className="flex gap-2 overflow-x-auto px-0.5 pb-1">
        {players.map((p) => <PlayerPanel key={p.id} player={p} size="small" texts={texts} />)}
      </div>
    </div>
  );
}
