import type { CricketMark } from "@/domain/game";

/** 0–3 marks as in a chalk scoreboard: nothing, one stroke, a cross, a circled cross (M7 plan §3). */
const SYMBOL = ["", "/", "X", "Ⓧ"] as const;

/** Cricket row of a player panel: the seven fields with the player's marks; closed for everyone = gray (CricketFieldClosed). */
export function CricketMarks({ marks, bull, label }: { marks: CricketMark[]; bull: string; label: string }) {
  return (
    <ol aria-label={label} className="grid grid-cols-7 gap-1">
      {marks.map((m) => (
        <li
          key={m.field}
          aria-label={`${m.field === 25 ? bull : m.field}: ${m.marks}`}
          className={`flex flex-col items-center rounded-slot py-0.5 fluid-text-sm leading-tight ${m.closed ? "bg-cricket-closed" : ""}`}
        >
          <span className="text-fg-muted">{m.field === 25 ? "B" : m.field}</span>
          <span className="min-h-icon-inline font-bold" data-marks={m.marks}>{SYMBOL[m.marks]}</span>
        </li>
      ))}
    </ol>
  );
}
