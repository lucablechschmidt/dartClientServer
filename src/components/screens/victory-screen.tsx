import type { ReactNode } from "react";
import { CardList, DetailRow } from "@/components/ui/card-list";
import { Button, ButtonLink, PrimaryButton } from "@/components/ui/form-controls";
import { UndoIcon } from "@/components/ui/icons";
import { StatPair, type Figure } from "@/components/ui/stat-pair";
import { VersusCard, type VersusRow } from "@/components/ui/versus-card";
import type { MatchBoardView, PlayerPanelData } from "@/domain/game";
import type { Texts } from "@/i18n/de";

type Props = {
  view: MatchBoardView;
  texts: Texts["game"];
  onUndoWinningDart: () => void;
  onRestart: () => Promise<void>;
  /** M9: a tournament game leads back to its tournament instead of offering a rematch. */
  tournamentHref?: string;
  /** M5 plan §9.2: set when the last player may still play out (3+ players, this device may enter for him). */
  onPlayOut: (() => void) | null;
  pending: boolean;
  /** M8: the X01 match page, only for the match's players. */
  statsHref?: string;
  /** M10: the banner with newly earned achievements, at the top. */
  achievements?: ReactNode;
};

type T = Texts["game"];
const two = (n: number) => n.toFixed(2);
const fill = (text: string, n: number | string) => text.replace("{n}", String(n));

/**
 * Port of ClassicGameVictoryView (design `Design/VictoryScreen*.png`): "Sieger" and the name, then
 * X01 1 vs 1 a comparison over every leg, otherwise the winner's figures and a card with everyone
 * else; below, the actions. The screen never scrolls: the banner and the player card do.
 */
export function VictoryScreen({
  view,
  texts,
  onUndoWinningDart,
  onRestart,
  onPlayOut,
  pending,
  tournamentHref,
  statsHref,
  achievements,
}: Props) {
  const players = view.board.players;
  const winner = players.find((p) => p.id === view.matchWinnerId);
  if (!winner) return null;
  const others = view.ranking.filter((id) => id !== winner.id).flatMap((id) => players.filter((p) => p.id === id));
  const totals = view.board.mode === "x01" && players.length === 2 && others.length === 1 ? view.totals : null;
  return (
    <div className="flex h-full flex-col gap-4 px-4 pb-4">
      {achievements && <div className="mx-auto max-h-banner w-full max-w-md shrink-0 overflow-y-auto">{achievements}</div>}
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col justify-center gap-5 motion-safe:animate-rise-in">
        <div className="flex shrink-0 flex-col items-center gap-1 text-center">
          <p className="text-xs font-semibold tracking-widest text-accent uppercase">{texts.winner}</p>
          <h1 className="text-fluid-xl font-bold tracking-tight wrap-anywhere">{winner.name}</h1>
        </div>
        {totals ? (
          <Versus view={view} totals={totals} winner={winner} other={others[0]} texts={texts} />
        ) : (
          <Standings view={view} winner={winner} others={others} texts={texts} />
        )}
        <div className="flex shrink-0 flex-col gap-2">
          {tournamentHref ? (
            <ButtonLink href={tournamentHref} variant="primary">
              {texts.toTournament}
            </ButtonLink>
          ) : (
            <form action={onRestart}>
              <PrimaryButton disabled={pending}>{texts.restart}</PrimaryButton>
            </form>
          )}
          {onPlayOut && view.lastPlayerId && !view.playOut && (
            <Button variant="outline" onClick={onPlayOut} disabled={pending}>
              {texts.playOut}
            </Button>
          )}
          <div className="flex gap-2">
            <Button onClick={onUndoWinningDart} disabled={pending}>
              <UndoIcon className="size-icon-xs shrink-0" />
              {texts.undoWinningDart}
            </Button>
            {statsHref && <ButtonLink href={statsHref}>{texts.matchStats}</ButtonLink>}
          </div>
          <ButtonLink href="/" variant="quiet">
            {texts.home}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

/** X01 1 vs 1: sets or legs big, then legs (with sets), darts (single leg), average and highest visit over the match. */
function Versus({
  view,
  totals,
  winner,
  other,
  texts,
}: {
  view: MatchBoardView;
  totals: NonNullable<MatchBoardView["totals"]>;
  winner: PlayerPanelData;
  other: PlayerPanelData;
  texts: T;
}) {
  const [w, o] = [totals[winner.id], totals[other.id]];
  const row = (label: string, pick: (t: typeof w) => string | number): VersusRow => ({
    label,
    left: String(pick(w)),
    right: String(pick(o)),
  });
  const sets = Boolean(view.score?.sets);
  const headline = view.score ? (sets ? row(texts.sets, (t) => t.sets) : row(texts.legs, (t) => t.legs)) : undefined;
  const rows = [
    ...(sets ? [row(texts.legs, (t) => t.legs)] : []),
    ...(view.score ? [] : [row(texts.darts, (t) => t.darts)]),
    row(texts.perVisit, (t) => two(t.average)),
    row(texts.highestVisit, (t) => t.highest),
  ];
  return (
    <div className="shrink-0">
      <VersusCard label={texts.result} left={winner.name} right={other.name} headline={headline} rows={rows} />
    </div>
  );
}

/** Every mode except X01 1 vs 1: the winner's figures, everyone else in place order, SplitScore the sum of all. */
function Standings({
  view,
  winner,
  others,
  texts,
}: {
  view: MatchBoardView;
  winner: PlayerPanelData;
  others: PlayerPanelData[];
  texts: T;
}) {
  const mode = view.board.mode;
  const places = view.ranking.length > 2;
  const darts: Figure = { label: texts.darts, value: String(winner.darts) };
  const average: Figure | null = winner.average === null ? null : { label: texts.perVisit, value: two(winner.average) };
  const figures: [Figure] | [Figure, Figure] =
    mode === "splitscore" && average
      ? [{ label: texts.points, value: String(winner.score) }, average]
      : average
        ? [darts, average]
        : [darts];
  return (
    <>
      <div className="shrink-0">
        <StatPair figures={figures} />
      </div>
      {others.length > 0 && (
        <CardList label={texts.result} tone="fill" className="min-h-0 overflow-y-auto">
          {others.map((p) => (
            <DetailRow
              key={p.id}
              lead={places ? view.places[p.id] : undefined}
              title={p.name}
              detail={detailOf(p, mode, texts)}
              value={valueOf(p, mode, texts)}
            />
          ))}
        </CardList>
      )}
      {view.board.total !== undefined && (
        <CardList tone="fill" className="shrink-0">
          <DetailRow title={texts.totalPoints} value={String(view.board.total)} />
        </CardList>
      )}
    </>
  );
}

/** The muted line under a name: darts and average; SplitScore only the average (everyone throws 27); Cricket the open fields. */
function detailOf(p: PlayerPanelData, mode: MatchBoardView["board"]["mode"], texts: T): string {
  const darts = fill(texts.dartCount, p.darts);
  const average = p.average === null ? null : fill(texts.averageOf, two(p.average));
  if (mode === "splitscore") return average ?? "";
  if (mode === "cricket") {
    const open = (p.marks ?? []).filter((m) => m.marks < 3).map((m) => (m.field === 25 ? texts.bull : String(m.field)));
    return open.length > 0 ? `${darts} · ${texts.openFields.replace("{fields}", open.join(" "))}` : darts;
  }
  return average ? `${darts} · ${average}` : darts;
}

/** On the right: X01 the rest or "checked out", every other mode the points. */
function valueOf(p: PlayerPanelData, mode: MatchBoardView["board"]["mode"], texts: T): string {
  if (mode !== "x01") return fill(texts.pointsOf, p.score);
  return p.isOut ? texts.checkedOut : fill(texts.restOf, p.score);
}
