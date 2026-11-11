import { lazy, Suspense, type ReactNode } from "react";
import type { PlayerId, PlayerPanelData } from "@/domain/game";
import type { Texts } from "@/i18n/de";
import { PlayerPanel, type PlayerPanelTexts } from "./player-panel";

/** Loaded only when the order may still change (sortable.tsx, dnd-kit). */
const SortableArea = lazy(() => import("./sortable").then((m) => ({ default: m.SortableArea })));
const SortableItem = lazy(() => import("./sortable").then((m) => ({ default: m.SortableItem })));

type Props = {
  players: PlayerPanelData[];
  texts: PlayerPanelTexts;
  /** ToStart (M5): set before the first dart of a leg; tapping a panel makes that player start. Its name is the panel's text. */
  onSelect?: (playerId: string) => void;
  /** 11.11.2026: 3+ players before the first dart: hold a small panel and drag it to change the order. */
  onReorder?: (order: PlayerId[]) => void;
  reorderTexts?: Texts["game"]["reorder"];
};

/** Port of ClassicGameInProgressView + MultiplayerView: ≤2 players large and stacked, ≥3 the active one large + a row of small ones. As in legacy, panels are as tall as their content. */
export function PlayerPanels({ players, texts, onSelect, onReorder, reorderTexts }: Props) {
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
  const small = (p: PlayerPanelData) => <PlayerPanel player={p} size="small" texts={texts} />;
  const row = (item: (p: PlayerPanelData) => ReactNode) => (
    <div className="flex gap-2 overflow-x-auto px-0.5 pb-1">{players.map(item)}</div>
  );
  const plain = row((p) => tappable(p, small(p)));
  return (
    <div className="grid content-start gap-2">
      <PlayerPanel player={active} texts={texts} />
      {onReorder && reorderTexts ? (
        <Suspense fallback={plain}>
          <SortableArea
            ids={players.map((p) => p.id)}
            onReorder={onReorder}
            nameOf={(id) => players.find((p) => p.id === id)?.name ?? ""}
            texts={reorderTexts}
          >
            {row((p) => (
              <SortableItem key={p.id} id={p.id} onTap={() => onSelect?.(p.id)} pressed={p.isActive} className="text-left">
                {small(p)}
              </SortableItem>
            ))}
          </SortableArea>
        </Suspense>
      ) : (
        plain
      )}
    </div>
  );
}
