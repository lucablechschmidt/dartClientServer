import Link from "next/link";
import { CardList, CardRow } from "@/components/ui/card-list";
import { SectionHeading } from "@/components/ui/form-controls";
import type { TournamentFormat } from "@/domain/tournament";
import type { Texts } from "@/i18n/de";

export type TournamentListItem = { id: string; name: string; format: TournamentFormat; players: string[]; winner: string | null };

/** All tournaments, newest first, with format, players and the winner or "running" (M9). */
export function TournamentList({ items, texts: t }: { items: TournamentListItem[]; texts: Texts["tournaments"] }) {
  return (
    <div className="flex flex-1 flex-col gap-3 bg-bg-grouped px-4 py-4 text-fg">
      <div className="flex items-center justify-between">
        <h1 className="text-title font-bold tracking-tight">{t.title}</h1>
        <Link href="/tournaments/new" className="min-h-touch content-center rounded-tile bg-accent px-4 font-semibold text-on-accent">
          {t.newTournament}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-fg-muted">{t.none}</p>
      ) : (
        <>
          <SectionHeading>{t.title}</SectionHeading>
          <CardList label={t.title}>
            {items.map((item) => (
              <CardRow key={item.id}>
                <Link href={`/tournaments/${item.id}`} className="flex min-h-touch w-full flex-col justify-center py-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="shrink-0 text-sm text-fg-muted">{t.formats[item.format]}</span>
                  </span>
                  <span className="truncate text-sm text-fg-muted">
                    {item.winner ? t.winner.replace("{name}", item.winner) : `${t.running} · ${item.players.join(" · ")}`}
                  </span>
                </Link>
              </CardRow>
            ))}
          </CardList>
        </>
      )}
    </div>
  );
}
