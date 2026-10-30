import type { PlayerPanelData } from "@/domain/game";
import { CircleSlashIcon } from "@/components/ui/icons";
import { DartSlots } from "./dart-slots";

export type PlayerPanelTexts = { darts: string; average: string; visit: string };

type Props = { player: PlayerPanelData; size?: "large" | "small"; texts: PlayerPanelTexts };

const fmt = (n: number) => n.toFixed(2);

/**
 * Port of PlayerDetailView / PlayerSmallDetailView. Display only; the data arrives already projected.
 * M5: a player who has checked out (3+ players) shows his place instead of the rest and is dimmed.
 * M7: the score is the rest (X01) or the points. Cricket has its own board (CricketTable, Figma).
 */
export function PlayerPanel({ player, size = "large", texts }: Props) {
  const border = player.isActive ? "border-frame-active" : "border-frame-fg";
  const dim = player.isOut ? "opacity-60" : "";
  const score = player.placement !== null ? `${player.placement}.` : player.score;
  if (size === "small") {
    // PlayerSmallDetailView: only the first 5 characters of the name and the remaining score, width ≈ 1/3 of the screen, no dart slots.
    return (
      <div
        className={`flex w-panel-sm shrink-0 flex-col items-center justify-center rounded-panel border-3 bg-frame-bg px-2 py-2 text-frame-text ${border} ${dim}`}
      >
        <span className="text-fluid-lg leading-tight">{player.name.slice(0, 5)}</span>
        <span className="text-fluid-lg leading-tight font-bold tabular-nums">{score}</span>
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-1 rounded-panel border-3 bg-frame-bg px-panel-x pt-2 pb-3 text-frame-text ${border} ${dim}`}>
      <div className="flex items-center justify-between gap-2 text-fluid-xl leading-tight">
        <span className="truncate font-normal tracking-tight">{player.name}</span>
        <span className="font-bold tabular-nums" data-score>
          {score}
        </span>
      </div>
      <PanelStats player={player} texts={texts} />
      <DartSlots slots={player.slots} isBust={player.isBust} label={texts.visit} />
    </div>
  );
}

/** Darts thrown and, where the mode has one, the average. */
function PanelStats({ player, texts }: { player: PlayerPanelData; texts: PlayerPanelTexts }) {
  return (
    <div className="flex items-center gap-2 text-fluid-sm tabular-nums">
      <span aria-label={texts.darts} className="flex items-center gap-1.5">
        <span aria-hidden="true">🎯</span>
        {player.darts}
      </span>
      {player.average !== null && (
        <span aria-label={texts.average} className="flex items-center gap-1.5">
          <CircleSlashIcon className="size-icon-inline" />
          {fmt(player.average)}
        </span>
      )}
    </div>
  );
}
