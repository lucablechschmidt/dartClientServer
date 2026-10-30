import type { CricketMark } from "@/domain/game";
import type { Texts } from "@/i18n/de";

export type CricketMarksTexts = Pick<Texts["game"], "marks" | "bull" | "bullShort" | "markSymbols">;

/** Cricket row of a player panel (M7 plan §3): the seven fields with the player's marks; closed for everyone = `--cricket-closed`. */
export function CricketMarks({ marks, texts }: { marks: CricketMark[]; texts: CricketMarksTexts }) {
  const isBull = (field: number) => field === 25;
  return (
    <ol aria-label={texts.marks} className="grid grid-cols-7 gap-1">
      {marks.map((m) => (
        <li
          key={m.field}
          aria-label={`${isBull(m.field) ? texts.bull : m.field}: ${m.marks}`}
          className={`flex flex-col items-center rounded-slot py-0.5 fluid-text-sm leading-tight ${m.closed ? "bg-cricket-closed" : ""}`}
        >
          <span className="text-fg-muted">{isBull(m.field) ? texts.bullShort : m.field}</span>
          <span className="min-h-icon-inline font-bold" data-marks={m.marks}>{texts.markSymbols[m.marks]}</span>
        </li>
      ))}
    </ol>
  );
}
