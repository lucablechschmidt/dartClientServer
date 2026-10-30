"use client";

import Link from "next/link";
import { useState } from "react";
import { BackButton } from "@/components/ui/back-button";
import { CardList, CardRow } from "@/components/ui/card-list";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { FormError, SectionHeading, TextButton } from "@/components/ui/form-controls";
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
export function TournamentScreen({ view, texts: t, back, onStart, onRedraw, onDelete }: Props) {
  const [error, setError] = useState<TournamentError | null>(null);
  const [deleting, setDeleting] = useState(false);
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
  const report = async (action: Promise<{ ok: boolean; reason?: TournamentError }>) => {
    const r = await action;
    setError(r.ok ? null : (r.reason ?? null));
  };

  return (
    <div className="flex flex-1 flex-col gap-4 bg-bg-grouped px-4 pb-4 text-fg">
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
          <TextButton onClick={() => void report(onRedraw())}>{t.redraw}</TextButton>
        </div>
      )}
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
                <FixtureAction fixture={f} texts={t} onStart={() => void report(onStart(f.id))} />
              </CardRow>
            ))}
          </CardList>
        </div>
      ))}
      {view.canDelete && (
        <TextButton tone="danger" onClick={() => setDeleting(true)}>
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
          void report(onDelete());
        }}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}

/** Right side of a game: result, "Spielen", the way back into a running match, a bye, or still open. */
function FixtureAction({
  fixture: f,
  texts: t,
  onStart,
}: {
  fixture: TournamentScreenView["fixtures"][number];
  texts: Texts["tournaments"];
  onStart: () => void;
}) {
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
  return <TextButton onClick={onStart}>{t.play}</TextButton>;
}
