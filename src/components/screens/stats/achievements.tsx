"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CardList } from "@/components/ui/card-list";
import { FoldCard } from "@/components/ui/fold-card";
import { MedalIcon } from "@/components/ui/icons";
import type { AchievementKey } from "@/domain/achievements/types";
import type { Texts } from "@/i18n/de";
import { relativeTime } from "../game-menu";

/** What the page gets from the server's myAchievements (structural, no server import). */
export type AchievementItem = { key: AchievementKey; earnedAt: number | null; progress?: { done: number; of: number } };
export type NewAchievementsView = { playerId: string; name: string; keys: AchievementKey[] }[];

type Texts10 = Texts["achievements"];

/**
 * The own achievements in the account tab (M10): a folded card with the count; open, every achievement,
 * earned ones with their time, open ones muted with how to get them, the progress of "Gotta catch 'Em All!".
 */
export function AchievementsSection({
  items,
  texts: t,
  overviewTexts,
  now,
}: {
  items: AchievementItem[];
  texts: Texts10;
  overviewTexts: Texts["overview"];
  now: number;
}) {
  const earned = items.filter((i) => i.earnedAt !== null).length;
  return (
    <FoldCard title={t.title} summary={t.count.replace("{n}", String(earned)).replace("{of}", String(items.length))}>
      <CardList label={t.title}>
        {items.map((item) => {
          const { name, how } = t.items[item.key];
          const line = item.earnedAt === null ? how : t.earned.replace("{when}", relativeTime(item.earnedAt, now, overviewTexts));
          return (
            <li key={item.key} aria-label={name} className="list-none border-b border-separator last:border-b-0">
              <Badge icon={<MedalIcon className="size-icon" />} name={name} line={line} earned={item.earnedAt !== null}>
                {item.progress && item.earnedAt === null && (
                  <span className="flex items-center gap-2">
                    <svg
                      viewBox={`0 0 ${item.progress.of} 1`}
                      preserveAspectRatio="none"
                      role="progressbar"
                      aria-label={name}
                      aria-valuemin={0}
                      aria-valuemax={item.progress.of}
                      aria-valuenow={item.progress.done}
                      className="h-1.5 flex-1 overflow-hidden rounded-full"
                    >
                      <rect width={item.progress.of} height="1" className="fill-fill-strong" />
                      <rect width={item.progress.done} height="1" className="fill-accent" />
                    </svg>
                    <span className="text-xs text-fg-muted tabular-nums">
                      {t.progress.replace("{done}", String(item.progress.done)).replace("{of}", String(item.progress.of))}
                    </span>
                  </span>
                )}
              </Badge>
            </li>
          );
        })}
      </CardList>
    </FoldCard>
  );
}

/**
 * The victory screen's "Neu für …" (M10): loaded once the game is saved on the server (`ready`), so
 * it sees the finished game; shows nothing when no player earned anything new.
 */
export function AchievementBanner({ load, ready, texts: t }: { load: () => Promise<NewAchievementsView>; ready: boolean; texts: Texts10 }) {
  const [news, setNews] = useState<NewAchievementsView | null>(null);
  useEffect(() => {
    if (!ready || news !== null) return;
    let live = true;
    void load().then((n) => live && setNews(n));
    return () => {
      live = false;
    };
  }, [ready, news, load]);
  if (!news || news.length === 0) return null;
  return (
    <section aria-label={t.title} aria-live="polite" className="flex flex-col gap-1 rounded-panel bg-accent-wash px-4 py-3">
      {news.map((n) => (
        <p key={n.playerId} className="flex items-start gap-2 text-fluid-sm">
          <MedalIcon className="size-icon shrink-0 text-accent" />
          <span>
            <span className="font-semibold">{t.banner.replace("{name}", n.name)}: </span>
            {n.keys.map((k) => t.items[k].name).join(" · ")}
          </span>
        </p>
      ))}
    </section>
  );
}
