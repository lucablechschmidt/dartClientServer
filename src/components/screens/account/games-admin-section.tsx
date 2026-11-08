"use client";

import { useState } from "react";
import { CardList, CardRow } from "@/components/ui/card-list";
import { FoldCard } from "@/components/ui/fold-card";
import { ErrorLine, SectionHeading, TextButton } from "@/components/ui/form-controls";
import { useAsyncAction } from "@/components/ui/use-async-action";
import { useConfirmTap } from "@/components/ui/use-confirm-tap";
import type { ModeId } from "@/domain/game";
import type { TournamentFormat } from "@/domain/tournament";
import type { Texts } from "@/i18n/de";
import { relativeTime } from "../game-menu";
import type { TournamentListItem } from "../tournament/tournament-list";
import type { AccountTexts } from "./types";

/** A game in the admin list (structural copy of the server's AdminMatchItem). */
export type AdminMatchRow = {
  id: string;
  mode: ModeId;
  names: string[];
  status: "running" | "finished" | "abandoned";
  startedAt: number;
  isTournament: boolean;
};
export type AdminMatchPage = { items: AdminMatchRow[]; hasMore: boolean };
type CleanupError = keyof AccountTexts["admin"]["cleanup"]["errors"];
type CleanupResult = { ok: true } | { ok: false; reason: CleanupError };

type Props = {
  tournaments: TournamentListItem[];
  matches: AdminMatchPage;
  now: number;
  texts: AccountTexts;
  overviewTexts: Texts["overview"];
  modeNames: Record<ModeId, string>;
  tournamentFormats: Record<TournamentFormat, string>;
  onDeleteMatch: (id: string) => Promise<CleanupResult>;
  onDeleteTournament: (id: string) => Promise<CleanupResult>;
  /** The next page of games after the first `offset`. */
  onLoadMore: (offset: number) => Promise<AdminMatchPage>;
};

/**
 * Admin (tab "Verwaltung"): a folded card with every tournament and every game, newest first, each
 * deletable after a second tap; for games and tournaments started by mistake or for testing. A
 * tournament goes with all its games. "Mehr anzeigen" loads the next page of games.
 */
export function GamesAdminSection({
  tournaments,
  matches,
  now,
  texts,
  overviewTexts,
  modeNames,
  tournamentFormats,
  onDeleteMatch,
  onDeleteTournament,
  onLoadMore,
}: Props) {
  const t = texts.admin.cleanup;
  const confirm = useConfirmTap();
  const [extra, setExtra] = useState<AdminMatchPage>({ items: [], hasMore: matches.hasMore });
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, CleanupError | undefined>>({});
  const shownTournaments = tournaments.filter((x) => !gone.has(x.id));
  const shownMatches = [...matches.items, ...extra.items].filter((m) => !gone.has(m.id));

  const removed = (r: CleanupResult, id: string) => {
    setErrors((e) => ({ ...e, [id]: r.ok ? undefined : r.reason }));
    if (r.ok) setGone((g) => new Set(g).add(id));
  };
  const removeMatch = useAsyncAction(onDeleteMatch, removed);
  // Its games go too; the page reloads them from the server, so drop the extra pages.
  const removeTournament = useAsyncAction(onDeleteTournament, (r, id) => {
    removed(r, id);
    if (r.ok) setExtra({ items: [], hasMore: matches.hasMore });
  });
  const more = useAsyncAction(onLoadMore, (page) => setExtra((x) => ({ items: [...x.items, ...page.items], hasMore: page.hasMore })));
  const deleteButton = (id: string, key: string, label: string, action: typeof removeMatch) => (
    <TextButton flush tone="danger" {...action.rowButton(id)} onClick={() => confirm.tap(key, () => action.run(id))}>
      {confirm.label(key, label, texts.admin.confirm)}
    </TextButton>
  );

  return (
    <FoldCard title={t.title}>
      <p className="px-4 text-sm text-fg-muted">{t.hint}</p>
      <SectionHeading>{t.tournaments}</SectionHeading>
      <CardList label={t.tournaments}>
        {shownTournaments.length === 0 && <CardRow className="text-fg-muted">{t.noTournaments}</CardRow>}
        {shownTournaments.map((x) => (
          <CardRow key={x.id} className="flex-col items-stretch gap-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate font-medium">{x.name}</span>
              <span className="shrink-0 text-sm text-fg-muted">{tournamentFormats[x.format]}</span>
            </span>
            <span className="truncate text-sm text-fg-muted">{x.players.join(" · ")}</span>
            <span className="flex items-baseline gap-2">
              {deleteButton(x.id, `t:${x.id}`, t.deleteTournament, removeTournament)}
              <span className="text-xs text-fg-muted">{t.deleteTournamentHint}</span>
            </span>
            <ErrorLine error={errors[x.id]} texts={t.errors} />
          </CardRow>
        ))}
      </CardList>
      <SectionHeading>{t.matches}</SectionHeading>
      <CardList label={t.matches}>
        {shownMatches.length === 0 && <CardRow className="text-fg-muted">{t.noMatches}</CardRow>}
        {shownMatches.map((m) => (
          <CardRow key={m.id} className="flex-col items-stretch gap-1">
            <span className="truncate font-medium">{m.names.join(" · ")}</span>
            <span className="truncate text-sm text-fg-muted">
              {[
                modeNames[m.mode],
                t.status[m.status],
                relativeTime(m.startedAt, now, overviewTexts),
                m.isTournament ? t.tournamentGame : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className="flex">{deleteButton(m.id, `m:${m.id}`, t.deleteMatch, removeMatch)}</span>
            <ErrorLine error={errors[m.id]} texts={t.errors} />
          </CardRow>
        ))}
      </CardList>
      {extra.hasMore && (
        <TextButton pending={more.pending} onClick={() => more.run(shownMatches.length)}>
          {t.more}
        </TextButton>
      )}
    </FoldCard>
  );
}
