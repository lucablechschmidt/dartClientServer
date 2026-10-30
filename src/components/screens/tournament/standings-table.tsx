import type { PlayerId } from "@/domain/game";
import type { StandingRow } from "@/domain/tournament";
import type { Texts } from "@/i18n/de";

/** The table of a group (or the round robin): place, player, played, wins, legs, average. */
export function StandingsTable({
  rows,
  names,
  label,
  texts,
}: {
  rows: StandingRow[];
  names: Record<PlayerId, string>;
  label: string;
  texts: Texts["tournaments"]["table"];
}) {
  const cell = "px-2 py-1 text-right tabular-nums";
  return (
    <table aria-label={label} className="w-full border-collapse rounded-panel bg-card-bg text-sm text-fg">
      <thead>
        <tr className="text-xs text-fg-muted">
          <th scope="col" className={cell}>
            {texts.place}
          </th>
          <th scope="col" className="px-2 py-1 text-left">
            {texts.player}
          </th>
          <th scope="col" className={cell}>
            {texts.played}
          </th>
          <th scope="col" className={cell}>
            {texts.wins}
          </th>
          <th scope="col" className={cell}>
            {texts.legs}
          </th>
          <th scope="col" className={cell}>
            {texts.average}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.player} className="border-t border-separator">
            <td className={cell}>{i + 1}</td>
            <th scope="row" className="truncate px-2 py-1 text-left font-medium">
              {names[r.player] ?? r.player}
            </th>
            <td className={cell}>{r.played}</td>
            <td className={cell}>{r.wins}</td>
            <td className={cell}>{`${r.legsFor}:${r.legsAgainst}`}</td>
            <td className={cell}>{r.average.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
