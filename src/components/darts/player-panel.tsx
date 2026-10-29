import type { PlayerPanelData } from "@/domain/x01";
import { CircleSlashIcon } from "@/components/ui/icons";
import { DartSlots } from "./dart-slots";

export type PlayerPanelTexts = { darts: string; average: string; visit: string };

type Props = { player: PlayerPanelData; size?: "large" | "small"; texts: PlayerPanelTexts };

const fmt = (n: number) => n.toFixed(2);

/** Port of PlayerDetailView / PlayerSmallDetailView. Display only; the data arrives already projected. */
export function PlayerPanel({ player, size = "large", texts }: Props) {
  const border = player.isActive ? "border-frame-active" : "border-frame-fg";
  if (size === "small") {
    // PlayerSmallDetailView: only the first 5 characters of the name and the remaining score, width ≈ 1/3 of the screen, no dart slots.
    return (
      <div className={`flex w-panel-sm shrink-0 flex-col items-center justify-center rounded-panel border-3 bg-frame-bg px-2 py-2 text-frame-text ${border}`}>
        <span className="fluid-text-lg leading-tight">{player.name.slice(0, 5)}</span>
        <span className="tabular fluid-text-lg font-bold leading-tight" >{player.rest}</span>
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-1 rounded-panel border-3 bg-frame-bg px-panel-x pt-2 pb-3 text-frame-text ${border}`}>
      <div className="flex items-center justify-between gap-2 fluid-text-xl leading-tight">
        <span className="truncate font-normal tracking-tight">{player.name}</span>
        <span className="tabular font-bold" data-rest>{player.rest}</span>
      </div>
      <div className="flex items-center gap-2 fluid-text-sm tabular">
        <span aria-label={texts.darts} className="flex items-center gap-1.5">
          <span aria-hidden="true">🎯</span>
          {player.darts}
        </span>
        <span aria-label={texts.average} className="flex items-center gap-1.5">
          <CircleSlashIcon className="size-icon-inline" />
          {fmt(player.average)}
        </span>
      </div>
      <DartSlots slots={player.slots} isBust={player.isBust} label={texts.visit} />
    </div>
  );
}
