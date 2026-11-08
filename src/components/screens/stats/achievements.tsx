"use client";

import { useEffect, useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CardList } from "@/components/ui/card-list";
import { DisclosureChevron } from "@/components/ui/choice-menu";
import { MedalIcon } from "@/components/ui/icons";
import type { GalleryItem, Progress, ProgressStep } from "@/domain/achievements/gallery";
import type { Texts } from "@/i18n/de";
import { relativeTime } from "../game-menu";
import type { NewAchievements } from "@/server/achievement-service";

/** One achievement of the gallery (domain) and what a finished game brought each player (server). */
export type AchievementItem = GalleryItem;
export type NewAchievementsView = NewAchievements[];

type Texts10 = Texts["achievements"];

/**
 * The own achievements on /account/achievements (M10): the count, then every achievement,
 * earned ones with their time, open ones muted with how to get them, the progress of counted ones.
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
    <div className="flex flex-col gap-3">
      <p className="px-4 text-sm text-fg-muted">{t.count.replace("{n}", String(earned)).replace("{of}", String(items.length))}</p>
      <CardList label={t.title}>
        {items.map((item) => (
          <AchievementRow key={item.key} item={item} texts={t} overviewTexts={overviewTexts} now={now} />
        ))}
      </CardList>
    </div>
  );
}

/**
 * One achievement. An open one with countable steps ("Gotta catch 'Em All!", and any later one with
 * `progress.steps`) folds open on a tap and lists the missing steps first, then the done ones.
 */
function AchievementRow({
  item,
  texts: t,
  overviewTexts,
  now,
}: {
  item: AchievementItem;
  texts: Texts10;
  overviewTexts: Texts["overview"];
  now: number;
}) {
  const [open, setOpen] = useState(false);
  const stepsId = useId();
  const { name, how } = t.items[item.key];
  const isEarned = item.earnedAt !== null;
  const line = item.earnedAt === null ? how : t.earned.replace("{when}", relativeTime(item.earnedAt, now, overviewTexts));
  const progress = !isEarned ? item.progress : undefined;
  const foldable = (progress?.steps.length ?? 0) > 0;
  const badge = (
    <Badge icon={<MedalIcon className="size-icon" />} name={name} line={line} earned={isEarned}>
      {progress && <ProgressBar progress={progress} label={name} texts={t} />}
    </Badge>
  );
  return (
    <li aria-label={name} className="list-none border-b border-separator last:border-b-0">
      {foldable ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={stepsId}
          onClick={() => setOpen((o) => !o)}
          className="tap-row flex items-center gap-2 tap-feedback text-left"
        >
          <span className="min-w-0 flex-1">{badge}</span>
          <DisclosureChevron open={open} />
        </button>
      ) : (
        badge
      )}
      {foldable && open && progress && (
        <div id={stepsId} className="pb-3 pl-14 motion-safe:animate-unfold">
          <div className="flex flex-col gap-2">
            <StepGroup title={t.missing} steps={progress.steps.filter((s) => !s.done)} done={false} />
            <StepGroup title={t.done} steps={progress.steps.filter((s) => s.done)} done />
          </div>
        </div>
      )}
    </li>
  );
}

function ProgressBar({ progress, label, texts: t }: { progress: Progress; label: string; texts: Texts10 }) {
  return (
    <span className="flex items-center gap-2">
      <svg
        viewBox={`0 0 ${progress.of} 1`}
        preserveAspectRatio="none"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={progress.of}
        aria-valuenow={progress.done}
        className="h-1.5 flex-1 overflow-hidden rounded-full"
      >
        <rect width={progress.of} height="1" className="fill-fill-strong" />
        <rect width={progress.done} height="1" className="fill-accent" />
      </svg>
      <span className="text-xs text-fg-muted tabular-nums">
        {t.progress.replace("{done}", String(progress.done)).replace("{of}", String(progress.of))}
      </span>
    </span>
  );
}

/** A labelled row of step chips: missing ones stand out, done ones are tinted in the accent. */
function StepGroup({ title, steps, done }: { title: string; steps: ProgressStep[]; done: boolean }) {
  if (steps.length === 0) return null;
  const heading = title.replace("{n}", String(steps.length));
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-fg-muted">{heading}</span>
      <ul aria-label={heading} className="flex flex-wrap gap-1.5">
        {steps.map((s) => (
          <li
            key={s.label}
            className={`min-w-10 rounded-box px-2 py-1 text-center text-xs font-semibold tabular-nums ${
              done ? "bg-accent-soft text-accent" : "border border-separator text-fg"
            }`}
          >
            {s.label}
          </li>
        ))}
      </ul>
    </div>
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
    <section
      aria-label={t.title}
      aria-live="polite"
      className="flex flex-col gap-1 rounded-panel bg-accent-wash px-4 py-3 motion-safe:animate-drop-in"
    >
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
