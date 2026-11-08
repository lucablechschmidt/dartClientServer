"use client";

import { useActionState, useState, type ReactNode } from "react";
import { PlayerPicker } from "@/components/darts/player-picker";
import { FoldCard } from "@/components/ui/fold-card";
import { BackButton } from "@/components/ui/back-button";
import { PageFrame, pageColumn } from "@/components/ui/page-frame";
import { ChoiceMenu, DisclosureChevron, LabeledValue, type Choice } from "@/components/ui/choice-menu";
import { ChoiceNumberField } from "@/components/ui/choice-number-field";
import { FormError } from "@/components/ui/form-controls";
import { ArrowRightIcon, PhoneIcon, TargetIcon } from "@/components/ui/icons";
import type { GuestResult, Player } from "@/domain/player";
import type { InvalidInput, ModeId } from "@/domain/game";
import type { Texts } from "@/i18n/de";

export type SetupProps = {
  players: Player[];
  texts: Texts["newGame"];
  commonTexts: { back: string; save: string; cancel: string };
  /** Redirects to the new match or tournament; answers only when the server rejects the form. */
  onStart: (formData: FormData) => Promise<InvalidInput | undefined>;
  onAddGuest: (formData: FormData) => Promise<GuestResult>;
};

type Props = SetupProps & {
  mode: ModeId;
  /**
   * The mode's option card(s); they get the number of chosen players (E7: sets/legs only with 2) and,
   * with `playersInOptions`, the folding players card to place among them.
   */
  options: (playerCount: number, players: ReactNode) => ReactNode;
  /** Tournament: the players card sits among the options instead of below the form. */
  playersInOptions?: boolean;
  /** Rules for the line below the start button ("501 · Single In / Double Out"). */
  summary: string[];
  /** M9: the tournament setup reuses the shell with its own heading, way back and start condition. */
  heading?: { title: string; subtitle: string };
  backHref?: string;
  canStart?: (playerCount: number) => boolean;
  startLabel?: string;
};

const FORM_ID = "new-match";

export type Rule = "single" | "double" | "triple";
const RULES: readonly Rule[] = ["single", "double", "triple"];
/** In or out rule as choices, labelled with the shared rule names ("Single In" …). */
export const ruleChoices = (names: Record<Rule, string>): Choice<Rule>[] => RULES.map((r) => ({ value: r, label: names[r] }));
/** Start score (X01) and target (Elimination), as in legacy. */
/** Best of legs or sets: odd numbers 1–99 (a typed even number rounds up); the server takes up to 50 to win. */
export const BEST_OF = { min: 1, max: 99, step: 2 } as const;

/** An own start or target score (X01, Elimination, tournament) instead of 501/401/301. */
export const CUSTOM_SCORE = { min: 2, max: 1001 } as const;

export const SCORE_CHOICES: readonly Choice<number>[] = [501, 401, 301].map((value) => ({ value, label: String(value) }));

/**
 * What every setup shares, in the Figma layout (Design/GameSetUpGameOptions*.png, own colors):
 * title with the mode, the mode's options, the input mode (E13), the player heading with the
 * PlayerPicker (or, for the tournament, a folding players card among the options), and the start
 * button at the bottom with a summary; the start button belongs to the form via `form=`.
 */
export function SetupShell({
  mode,
  players,
  texts,
  commonTexts,
  onStart,
  onAddGuest,
  options,
  summary,
  heading,
  backHref = "/",
  canStart = (n) => n > 0,
  startLabel,
  playersInOptions = false,
}: Props) {
  const [order, setOrder] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<"single" | "per-player">("single");
  // `starting` until the new match is shown (the action redirects): a second tap creates no second match.
  const [error, start, starting] = useActionState(
    async (_prev: string | null, fd: FormData) => ((await onStart(fd)) ? texts.invalidInput : null),
    null,
  );
  const toggle = (id: string) => setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const inputModes: Choice<"single" | "per-player">[] = [
    { value: "single", label: texts.inputModes.single },
    { value: "per-player", label: texts.inputModes["per-player"] },
  ];
  const count = texts.selectedCount.replace("{n}", String(order.length));
  const picker = (
    <PlayerPicker
      players={players}
      order={order}
      onToggle={toggle}
      onAddGuest={onAddGuest}
      texts={{ ...texts, save: commonTexts.save, cancel: commonTexts.cancel }}
    />
  );

  return (
    <div className="flex flex-1 flex-col bg-bg-grouped px-4 text-fg">
      <PageFrame className="flex-1 gap-4 pb-4">
        <div className="flex">
          <BackButton href={backHref} label={commonTexts.back} />
        </div>
        <div>
          <h1 className="text-title font-bold tracking-tight">{heading?.title ?? texts.title}</h1>
          <p className="text-sm text-fg-muted">{heading?.subtitle ?? texts.modes[mode]}</p>
        </div>

        <form id={FORM_ID} action={start} className="flex flex-col gap-3">
          <input type="hidden" name="mode" value={mode} />
          {order.map((id) => (
            <input key={id} type="hidden" name="playerId" value={id} />
          ))}
          {options(
            order.length,
            playersInOptions && (
              <FoldCard title={texts.choosePlayersTitle} summary={count} defaultOpen>
                {picker}
              </FoldCard>
            ),
          )}
          <ChoiceMenu
            name="inputMode"
            label={texts.inputMode}
            value={inputMode}
            onChange={setInputMode}
            options={inputModes}
            className="rounded-panel border border-transparent bg-card-bg px-4 py-3"
            openClassName="border-accent"
          >
            {(current, open) => (
              <span className="flex items-center gap-3">
                <PhoneIcon className="size-icon shrink-0 text-fg-muted" />
                <LabeledValue label={texts.inputMode} value={current} />
                <DisclosureChevron open={open} />
              </span>
            )}
          </ChoiceMenu>
        </form>

        {!playersInOptions && (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold">{texts.choosePlayersTitle}</h2>
              <span className="text-sm text-fg-muted">{count}</span>
            </div>
            {picker}
          </>
        )}
      </PageFrame>

      <div className="sticky bottom-0 bg-bg-grouped pt-3 pb-safe-min">
        <div className={pageColumn()}>
          {error && <FormError centered>{error}</FormError>}
          <button
            type="submit"
            form={FORM_ID}
            disabled={!canStart(order.length) || starting}
            aria-busy={starting || undefined}
            className="flex min-h-cta w-full items-center justify-between rounded-panel bg-accent px-5 text-lg font-bold text-on-accent disabled:opacity-40"
          >
            {startLabel ?? texts.start}
            <ArrowRightIcon className="size-icon" />
          </button>
          <p className="mt-2 text-center text-xs text-fg-muted">
            {[texts.summaryPlayers.replace("{n}", String(order.length)), ...summary].join(" · ")}
          </p>
        </div>
      </div>
    </div>
  );
}

/** White card holding a mode's options. */
export function SetupCard({ children }: { children: ReactNode }) {
  return <section className="flex flex-col gap-3 rounded-panel bg-card-bg p-4">{children}</section>;
}

/** Top row of the options card: target icon, title and subtitle, the score big with its choice list. */
export function ScoreChoice({
  title,
  subtitle,
  value,
  options,
  onChange,
  customLabel,
}: {
  title: string;
  subtitle: string;
  value: number;
  options: readonly Choice<number>[];
  onChange: (v: number) => void;
  /** Label of the last entry, a field for an own score (CUSTOM_SCORE). */
  customLabel: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-icon-box shrink-0 place-items-center rounded-tile bg-accent-soft text-accent">
        <TargetIcon className="size-icon" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="font-semibold">{title}</span>
        <span className="text-xs text-fg-muted">{subtitle}</span>
      </span>
      <ChoiceMenu
        name="startScore"
        label={title}
        value={value}
        onChange={onChange}
        options={options}
        align="end"
        last={({ selected, close }) => (
          <ChoiceNumberField label={customLabel} value={value} selected={selected} onChange={onChange} close={close} {...CUSTOM_SCORE} />
        )}
      >
        {(current, open) => (
          <span className="flex items-center gap-1">
            <span className="text-display font-bold tabular-nums">{current}</span>
            <DisclosureChevron open={open} />
          </span>
        )}
      </ChoiceMenu>
    </div>
  );
}

/** A tile with a small label above the chosen rule (in rule / Single In); opened it is outlined in the accent. */
export function RuleTile<V extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: V;
  options: readonly Choice<V>[];
  onChange: (v: V) => void;
}) {
  return (
    <ChoiceMenu
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      className="rounded-tile border border-transparent bg-fill px-3 py-2"
      openClassName="border-accent bg-accent-wash"
    >
      {(current, open) => (
        <span className="flex items-center gap-2">
          <LabeledValue label={label} value={current} />
          <DisclosureChevron open={open} />
        </span>
      )}
    </ChoiceMenu>
  );
}

/** Fixed rule values a mode does not let the user choose (Cricket, SplitScore). */
export function FixedRules({ startScore }: { startScore: number }) {
  return (
    <>
      <input type="hidden" name="startScore" value={startScore} />
      <input type="hidden" name="inRule" value="single" />
      <input type="hidden" name="outRule" value="single" />
    </>
  );
}
