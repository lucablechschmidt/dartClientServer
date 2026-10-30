import type { PlayerPanelData } from "@/domain/game";
import { CircleSlashIcon } from "@/components/ui/icons";
import { CricketMarks, type CricketMarksTexts } from "./cricket-marks";
import { DartSlots } from "./dart-slots";

/** Cricket texts are only needed where a mode shows marks. */
export type PlayerPanelTexts = { darts: string; average: string; visit: string } & Partial<CricketMarksTexts>;

type Props = { player: PlayerPanelData; size?: "large" | "small"; texts: PlayerPanelTexts };

const fmt = (n: number) => n.toFixed(2);

/**
 * Port of PlayerDetailView / PlayerSmallDetailView. Display only; the data arrives already projected.
 * M5: a player who has checked out (3+ players) shows his place instead of the rest and is dimmed.
 * M7: the score is the rest (X01) or the points; Cricket adds the row of marks.
 */
export function PlayerPanel({ player, size = "large", texts }: Props) {
  const border = player.isActive ? "border-frame-active" : "border-frame-fg";
  const dim = player.isOut ? "opacity-60" : "";
  const score = player.placement !== null ? `${player.placement}.` : player.score;
  if (size === "small") {
    // PlayerSmallDetailView: only the first 5 characters of the name and the remaining score, width ≈ 1/3 of the screen, no dart slots.
    return (
      <div className={`flex w-panel-sm shrink-0 flex-col items-center justify-center rounded-panel border-3 bg-frame-bg px-2 py-2 text-frame-text ${border} ${dim}`}>
        <span className="fluid-text-lg leading-tight">{player.name.slice(0, 5)}</span>
        <span className="tabular fluid-text-lg font-bold leading-tight">{score}</span>
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-1 rounded-panel border-3 bg-frame-bg px-panel-x pt-2 pb-3 text-frame-text ${border} ${dim}`}>
      <div className="flex items-center justify-between gap-2 fluid-text-xl leading-tight">
        <span className="truncate font-normal tracking-tight">{player.name}</span>
        <span className="tabular font-bold" data-score>{score}</span>
      </div>
      <div className="flex items-center gap-2 fluid-text-sm tabular">
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
      <DartSlots slots={player.slots} isBust={player.isBust} label={texts.visit} />
      {player.marks && texts.marks && texts.bull && texts.bullShort && texts.markSymbols && (
        <CricketMarks marks={player.marks} texts={{ marks: texts.marks, bull: texts.bull, bullShort: texts.bullShort, markSymbols: texts.markSymbols }} />
      )}
    </div>
  );
}
