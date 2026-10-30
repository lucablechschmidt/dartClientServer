import type { PlayerId, PlayerPanelData } from "@/domain/game";
import type { Texts } from "@/i18n/de";
import { XmarkCircleIcon } from "@/components/ui/icons";
import { DartSlots } from "./dart-slots";

export type CricketTableTexts = Pick<Texts["game"], "marks" | "target" | "onTurn" | "bull" | "markSymbols" | "toStart">;

type Props = {
  players: PlayerPanelData[];
  activePlayerId: PlayerId;
  texts: CricketTableTexts;
  /** ToStart: before the first dart, tapping a player's column head makes them start. */
  onSelect?: (playerId: PlayerId) => void;
};

const BULL = 25;
const CLOSED = 3;

/** —, /, X from the texts; the closing third mark as a circled cross (Figma). */
function Mark({ marks, symbols }: { marks: number; symbols: readonly string[] }) {
  return marks >= CLOSED ? <XmarkCircleIcon className="size-icon-sm" /> : <>{symbols[marks]}</>;
}

/**
 * Cricket board in the Figma layout (Design/CricketGameInProgress*.png, own colors): one column per
 * player with name and points, one row per field from 15 to Bull. A field closed by everyone is gray
 * and struck through; a field a player has closed but not everyone is green, and its row label turns
 * green when the player on turn can score on it.
 */
export function CricketTable({ players, activePlayerId, texts, onSelect }: Props) {
  const fields = players[0]?.marks ?? [];
  const active = players.find((p) => p.id === activePlayerId);
  const column = (id: PlayerId) => (id === activePlayerId ? "bg-accent-wash" : "");

  return (
    <div className="h-full overflow-x-auto rounded-panel bg-card-bg text-fg">
      <table aria-label={texts.marks} className="h-full w-full border-collapse text-fluid-sm">
        <thead>
          <tr>
            <th scope="col" className="w-cricket-label px-2 pb-1 text-left align-bottom text-xs font-semibold text-fg-muted uppercase">
              {texts.target}
            </th>
            {players.map((p) => {
              const isActive = p.id === activePlayerId;
              const head = (
                <span className="flex flex-col items-center leading-tight">
                  <span className="min-h-icon-inline text-xs font-semibold text-accent uppercase">{isActive ? texts.onTurn : null}</span>
                  <span className="max-w-full truncate font-semibold">{p.name}</span>
                  <span className={`text-fluid-lg font-bold tabular-nums ${isActive ? "text-accent" : ""}`} data-score>
                    {p.score}
                  </span>
                </span>
              );
              return (
                <th
                  key={p.id}
                  scope="col"
                  aria-current={isActive || undefined}
                  className={`min-w-cricket-col border-l border-separator px-1 py-1 ${isActive ? "border-t-4 border-t-accent" : "border-t-4 border-t-transparent"} ${column(p.id)}`}
                >
                  {onSelect ? (
                    <button type="button" onClick={() => onSelect(p.id)} aria-label={`${texts.toStart}: ${p.name}`} className="w-full">
                      {head}
                    </button>
                  ) : (
                    head
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {fields.map((f, row) => {
            const label = f.field === BULL ? texts.bull : String(f.field);
            const canScore = !f.closed && (active?.marks?.[row].marks ?? 0) >= CLOSED;
            const labelTone = f.closed
              ? "bg-cricket-closed text-on-accent line-through"
              : canScore
                ? "bg-cricket-scoring text-key-triple"
                : "";
            return (
              <tr key={f.field} className="border-t border-separator">
                <th scope="row" className={`px-2 text-left font-bold tabular-nums ${labelTone}`}>
                  {label}
                </th>
                {players.map((p) => {
                  const marks = p.marks?.[row].marks ?? 0;
                  const tone = f.closed ? "bg-cricket-closed text-on-accent" : marks >= CLOSED ? "bg-cricket-scoring text-key-triple" : "";
                  return (
                    <td key={p.id} className={`border-l border-separator px-1 text-center ${column(p.id)}`}>
                      <span
                        aria-label={`${p.name}, ${label}: ${marks}`}
                        className={`grid place-items-center rounded-box leading-tight ${tone} ${marks === 0 ? "text-fg-muted" : "text-fluid-lg font-bold"}`}
                      >
                        <Mark marks={marks} symbols={texts.markSymbols} />
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Below the Cricket table (Figma): the player on turn in a wide bar and the slots of the visit being thrown. */
export function CricketTurn({ title, player, visitLabel }: { title: string; player: PlayerPanelData | undefined; visitLabel: string }) {
  return (
    <div className="flex flex-col gap-2 px-3">
      <p className="truncate rounded-full bg-hint-bg px-4 text-center text-fluid-xl text-fg" aria-live="polite">
        {title}
      </p>
      {player && <DartSlots slots={player.slots} isBust={player.isBust} label={visitLabel} />}
    </div>
  );
}
