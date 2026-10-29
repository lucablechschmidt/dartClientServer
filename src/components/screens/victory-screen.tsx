import Link from "next/link";
import type { ScoreboardView } from "@/domain/x01";
import type { Texts } from "@/i18n/de";

type Props = {
  board: ScoreboardView;
  texts: Texts["game"];
  onUndoWinningDart: () => void;
  onRestart: () => Promise<void>;
  pending: boolean;
};

const button = "min-h-touch w-full rounded-xl px-4 font-medium";

/** Port of ClassicGameVictoryView. */
export function VictoryScreen({ board, texts, onUndoWinningDart, onRestart, pending }: Props) {
  const winner = board.players.find((p) => p.id === board.winnerId);
  if (!winner) return null;
  const others = board.ranking.filter((id) => id !== winner.id).map((id) => board.players.find((p) => p.id === id)!);
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <p className="fluid-text-xl font-semibold">{texts.youWin.replace("{name}", winner.name)}</p>
        <p className="fluid-text-sm text-fg-muted tabular">🎯 {winner.darts} · {texts.average} {winner.average.toFixed(2)}</p>
      </div>
      <ul className="flex flex-col gap-1 fluid-text-sm">
        {others.map((p) => (
          <li key={p.id} className="flex justify-between tabular">
            <span>{p.name}</span>
            <span>{texts.rest} {p.rest} · {texts.average} {p.average.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onUndoWinningDart} disabled={pending} className={`${button} border border-frame-fg`}>
          {texts.undoWinningDart}
        </button>
        <form action={onRestart}>
          <button type="submit" disabled={pending} className={`${button} bg-accent text-white`}>{texts.restart}</button>
        </form>
        <Link href="/" className={`${button} inline-flex items-center justify-center text-fg-muted`}>{texts.home}</Link>
      </div>
    </div>
  );
}
