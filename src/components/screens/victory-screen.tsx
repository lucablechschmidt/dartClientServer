import Link from "next/link";
import type { MatchBoardView } from "@/domain/game";
import type { Texts } from "@/i18n/de";
import { scoreLine } from "./leg-victory-screen";

type Props = {
  view: MatchBoardView;
  texts: Texts["game"];
  onUndoWinningDart: () => void;
  onRestart: () => Promise<void>;
  /** M5 plan §9.2: set when the last player may still play out (3+ players, this device may enter for him). */
  onPlayOut: (() => void) | null;
  pending: boolean;
};

const button = "min-h-touch w-full rounded-tile px-4 font-medium";

/** Port of ClassicGameVictoryView; M5: result in legs/sets, with 3+ players the table of places. */
export function VictoryScreen({ view, texts, onUndoWinningDart, onRestart, onPlayOut, pending }: Props) {
  const players = view.board.players;
  const winner = players.find((p) => p.id === view.matchWinnerId);
  if (!winner) return null;
  const byId = (id: string) => players.filter((p) => p.id === id);
  const places = view.ranking.length > 2;
  const scoreLabel = view.board.mode === "x01" ? texts.rest : texts.points;
  const avg = (a: number | null) => (a === null ? "" : ` · ${texts.average} ${a.toFixed(2)}`);
  const others = view.ranking.filter((id) => id !== winner.id).flatMap(byId);
  const last = view.lastPlayerId ? (byId(view.lastPlayerId).at(0) ?? null) : null;
  // my-auto centers while it fits and scrolls instead of overlapping the header when it does not.
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto my-auto flex w-full max-w-md flex-col gap-6 px-4 py-2">
        <div className="text-center">
          <p className="fluid-text-xl font-semibold">{texts.youWin.replace("{name}", winner.name)}</p>
          <p className="fluid-text-sm tabular text-fg-muted">
            🎯 {winner.darts}
            {avg(winner.average)}
          </p>
          {view.score && (
            <p className="fluid-text-sm tabular">
              {scoreLine(
                view,
                players.map((p) => p.id),
                texts,
              )}
            </p>
          )}
          {view.board.total !== undefined && (
            <p className="fluid-text-sm tabular">{texts.total.replace("{n}", String(view.board.total))}</p>
          )}
        </div>
        <ul className="fluid-text-sm flex flex-col gap-1">
          {others.map((p) => (
            <li key={p.id} className="tabular flex justify-between gap-2">
              <span>{places ? `${view.places[p.id]}. ${p.name}` : p.name}</span>
              <span>
                {p.isOut ? `🎯 ${p.darts}` : `${scoreLabel} ${p.score}`}
                {avg(p.average)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onUndoWinningDart} disabled={pending} className={`${button} border border-frame-fg`}>
            {texts.undoWinningDart}
          </button>
          {onPlayOut && last && !view.playOut && (
            <button type="button" onClick={onPlayOut} disabled={pending} className={`${button} border border-frame-fg`}>
              {texts.playOut.replace("{name}", last.name)}
            </button>
          )}
          <form action={onRestart}>
            <button type="submit" disabled={pending} className={`${button} bg-accent text-on-accent`}>
              {texts.restart}
            </button>
          </form>
          <Link href="/" className={`${button} inline-flex items-center justify-center text-fg-muted`}>
            {texts.home}
          </Link>
        </div>
      </div>
    </div>
  );
}
