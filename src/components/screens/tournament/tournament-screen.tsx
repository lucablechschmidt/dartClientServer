"use client";

import Link from "next/link";
import { useState } from "react";
import { BackButton } from "@/components/ui/back-button";
import { PageFrame } from "@/components/ui/page-frame";
import { CardList, CardRow } from "@/components/ui/card-list";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { FormError, SectionHeading, TextButton } from "@/components/ui/form-controls";
import { SpinnerIcon } from "@/components/ui/icons";
import { useAsyncAction } from "@/components/ui/use-async-action";
import type { PlayerId } from "@/domain/game";
import type { ResolvedFixture, StandingRow, TournamentFormat } from "@/domain/tournament";
import type { Texts } from "@/i18n/de";
import { knockoutRoundLabel } from "./rounds";
import { StandingsTable } from "./standings-table";

/** What the page needs from the server's TournamentView (structural, no server import). */
export type TournamentScreenView = {
  id: string;
  name: string;
  format: TournamentFormat;
  players: { id: PlayerId; name: string }[];
  fixtures: (ResolvedFixture & {
    matchId: string | null;
    matchStatus: "running" | "finished" | "abandoned" | null;
    legs: [number, number] | null;
    walkover: boolean;
  })[];
  groups: { group: number; rows: StandingRow[] }[];
  winner: PlayerId | null;
  canRedraw: boolean;
  canDelete: boolean;
};

type TournamentError = keyof Texts["tournaments"]["errors"];
type Props = {
  view: TournamentScreenView;
  texts: Texts["tournaments"];
  back: string;
  onStart: (fixtureId: string) => Promise<{ ok: false; reason: TournamentError }>;
  onRedraw: () => Promise<{ ok: true } | { ok: false; reason: TournamentError }>;
  onDelete: () => Promise<{ ok: false; reason: TournamentError }>;
};

/**
 * A tournament (M9): winner, tables of the group phase, the schedule by round with "Spielen" on every
 * game whose players are known, the draw of the seed list before the first game, and delete.
 */
/** Shortest time the redraw spinner shows (ms). */
const MIN_DRAWING_MS = 450;

export function TournamentScreen({ view, texts: t, back, onStart, onRedraw, onDelete }: Props) {
  const [error, setError] = useState<TournamentError | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const names = Object.fromEntries(view.players.map((p) => [p.id, p.name]));
  /** A side not known yet is "offen"; the empty side of a bye fixture is the bye itself. */
  const name = (id: PlayerId | null, bye = false) => (id ? (names[id] ?? id) : bye ? t.bye : t.waiting);
  const knockoutRounds = Math.max(0, ...view.fixtures.filter((f) => f.phase === "knockout").map((f) => f.round));
  const sections = [
    ...view.groups.flatMap(({ group }) =>
      [...new Set(view.fixtures.filter((f) => f.phase === "group" && f.group === group).map((f) => f.round))].map((round) => ({
        key: `g${group}-${round}`,
        title: [view.groups.length > 1 ? t.group.replace("{n}", String(group)) : null, t.roundOf.replace("{n}", String(round))]
          .filter(Boolean)
          .join(" · "),
        fixtures: view.fixtures.filter((f) => f.phase === "group" && f.group === group && f.round === round),
      })),
    ),
    ...Array.from({ length: knockoutRounds }, (_, i) => ({
      key: `k${i + 1}`,
      title: knockoutRoundLabel(i + 1, knockoutRounds, t),
      fixtures: view.fixtures.filter((f) => f.phase === "knockout" && f.round === i + 1),
    })),
  ];
  const report = (r: { ok: boolean; reason?: TournamentError }) => setError(r.ok ? null : (r.reason ?? null));
  // Start and delete redirect on success; until the new page is there the buttons stay busy (R-16).
  const start = useAsyncAction(onStart, report);
  const remove = useAsyncAction(onDelete, report);
  /** The draw is quick; the spinner stays a moment so a new draw is noticed even when it looks alike. */
  const redraw = async () => {
    setDrawing(true);
    try {
      const [r] = await Promise.all([onRedraw(), new Promise((done) => setTimeout(done, MIN_DRAWING_MS))]);
      report(r);
    } finally {
      setDrawing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-bg-grouped px-4 pb-4 text-fg">
      <PageFrame className="gap-4">
        <div className="flex">
          <BackButton href="/tournaments" label={back} />
        </div>
        <div>
          <h1 className="text-title font-bold tracking-tight">{view.name}</h1>
          <p className="text-sm text-fg-muted">{t.formats[view.format]}</p>
        </div>
        {view.winner && (
          <p className="rounded-panel bg-accent-wash px-4 py-3 text-center text-fluid-lg font-semibold">
            {t.winner.replace("{name}", name(view.winner))}
          </p>
        )}
        {error && <FormError>{t.errors[error]}</FormError>}
        {view.canRedraw && (
          <div className="flex items-center justify-between gap-3 rounded-panel bg-card-bg px-4 py-2">
            <span className="text-sm text-fg-muted">{t.seedHint}</span>
            <TextButton onClick={() => void redraw()} disabled={drawing} aria-busy={drawing} className="flex items-center gap-2">
              {drawing && <SpinnerIcon className="size-icon-sm motion-safe:animate-spin" />}
              {drawing ? t.drawing : t.redraw}
            </TextButton>
          </div>
        )}
        {/* While drawing, bracket and groups fade back; the new draw fades in. */}
        <div
          aria-busy={drawing}
          className={`flex flex-col gap-4 motion-safe:transition-opacity motion-safe:duration-base motion-safe:ease-ios ${drawing ? "opacity-40" : ""}`}
        >
          {view.groups.map(({ group, rows }) => (
            <div key={group} className="flex flex-col gap-2">
              <SectionHeading>{view.groups.length > 1 ? t.group.replace("{n}", String(group)) : t.formats["round-robin"]}</SectionHeading>
              <StandingsTable rows={rows} names={names} label={t.group.replace("{n}", String(group))} texts={t.table} />
            </div>
          ))}
          {sections.map((s) => (
            <div key={s.key} className="flex flex-col gap-2">
              <SectionHeading>{s.title}</SectionHeading>
              <CardList label={s.title}>
                {s.fixtures.map((f) => (
                  <CardRow key={f.id}>
                    <span className="flex min-w-0 flex-col">
                      <span className={`truncate ${f.winner === f.a && f.status === "done" ? "font-semibold" : ""}`}>
                        {name(f.a, f.status === "bye")}
                      </span>
                      <span className={`truncate ${f.winner === f.b && f.status === "done" ? "font-semibold" : ""}`}>
                        {name(f.b, f.status === "bye")}
                      </span>
                    </span>
                    <FixtureAction fixture={f} texts={t} button={start.rowButton(f.id)} onStart={() => start.run(f.id)} />
                  </CardRow>
                ))}
              </CardList>
            </div>
          ))}
        </div>
        {view.canDelete && (
          <TextButton tone="danger" pending={remove.pending} onClick={() => setDeleting(true)}>
            {t.delete}
          </TextButton>
        )}
        <ConfirmSheet
          open={deleting}
          text={t.deleteQuestion}
          confirmLabel={t.deleteConfirm}
          cancelLabel={t.cancel}
          onConfirm={() => {
            setDeleting(false);
            remove.run();
          }}
          onCancel={() => setDeleting(false)}
        />
      </PageFrame>
    </div>
  );
}

/** Right side of a game: result, "Spielen", the way back into a running match, a bye, or still open. */
function FixtureAction({
  fixture: f,
  texts: t,
  button,
  onStart,
}: {
  fixture: TournamentScreenView["fixtures"][number];
  texts: Texts["tournaments"];
  /** Busy while this fixture's game is being started, disabled while another one is. */
  button: { pending: boolean; disabled: boolean };
  onStart: () => void;
}) {
  if (f.status === "done" && f.walkover) return <span className="shrink-0 text-sm text-fg-muted">{t.walkover}</span>;
  if (f.status === "done") return <span className="shrink-0 font-semibold tabular-nums">{f.legs ? f.legs.join(":") : ""}</span>;
  if (f.status === "bye") return null;
  if (f.status === "waiting") return <span className="shrink-0 text-sm text-fg-muted">{t.waiting}</span>;
  if (f.matchId && f.matchStatus === "running") {
    return (
      <Link href={`/match/${f.matchId}`} className="shrink-0 font-medium text-accent">
        {t.open}
      </Link>
    );
  }
  return (
    <TextButton {...button} onClick={onStart}>
      {t.play}
    </TextButton>
  );
}
