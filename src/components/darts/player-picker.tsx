"use client";

import Link from "next/link";
import { AddRow } from "@/components/ui/add-row";
import { CardList, CardRow } from "@/components/ui/card-list";
import { PersonIcon, PersonPlusIcon } from "@/components/ui/icons";
import { isGuest, type Player } from "@/domain/player";
import type { Texts } from "@/i18n/de";

export type PlayerPickerTexts = Pick<
  Texts["newGame"],
  "choosePlayers" | "noPlayers" | "addGuest" | "guestNamePlaceholder" | "guestBadge" | "nameTaken" | "selected" | "select" | "deselect"
> & {
  save: string;
  cancel: string;
};

type Props = {
  players: Player[];
  /** Selected players in throwing order. */
  order: string[];
  onToggle: (id: string) => void;
  /** E12: creates a guest and returns its id; the picker selects it immediately. */
  onAddGuest: (formData: FormData) => Promise<{ ok: true; id: string } | { ok: false; reason: "name-taken" }>;
  texts: PlayerPickerTexts;
};

/** One letter per player, two where an earlier player already has that letter (Figma: "H" Haflinger, "HI" Hippo). */
export function initials(players: Player[]): Record<string, string> {
  const taken = new Set<string>();
  const out: Record<string, string> = {};
  for (const p of players) {
    const one = p.name.slice(0, 1).toUpperCase();
    const label = taken.has(one) ? p.name.slice(0, 2).toUpperCase() : one;
    taken.add(label);
    out[p.id] = label;
  }
  return out;
}

/**
 * Port of PlayerSelectionView in the Figma layout: avatar, name, guest badge and a box that shows
 * the throwing position once tapped (players are tapped in order). Adding a guest is a button
 * below the list (tap → input field → Enter). Sits outside the match form because the guest row
 * is a form of its own.
 */
export function PlayerPicker({ players, order, onToggle, onAddGuest, texts }: Props) {
  const fill = (s: string, name: string) => s.replace("{name}", name);
  const letters = initials(players);
  const addGuest = async (fd: FormData) => {
    const r = await onAddGuest(fd);
    if (!r.ok) return texts.nameTaken;
    onToggle(r.id);
    return null;
  };

  return (
    <div className="flex flex-col gap-3">
      <CardList label={texts.choosePlayers}>
        {players.length === 0 && (
          <CardRow className="justify-center text-fg-muted">
            <Link href="/players" className="underline">
              {texts.noPlayers}
            </Link>
          </CardRow>
        )}
        {players.map((p) => {
          const pos = order.indexOf(p.id);
          const selected = pos >= 0;
          const guest = isGuest(p);
          return (
            <CardRow
              key={p.id}
              onClick={() => onToggle(p.id)}
              pressed={selected}
              label={fill(selected ? texts.deselect : texts.select, p.name)}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={`grid size-avatar shrink-0 place-items-center rounded-full text-xs font-semibold ${guest ? "bg-fill-strong text-fg-muted" : "bg-accent-soft text-accent"}`}
                  aria-hidden="true"
                >
                  {guest ? <PersonIcon className="size-icon-xs" /> : letters[p.id]}
                </span>
                <span className={`truncate text-base ${selected ? "font-semibold" : ""}`}>{p.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                {guest && (
                  <span className="rounded-box bg-fill-strong px-2 py-0.5 text-xs font-semibold tracking-wide text-fg-muted uppercase">
                    {texts.guestBadge}
                  </span>
                )}
                {selected ? (
                  <span
                    className="grid size-check place-items-center rounded-box bg-accent text-sm font-semibold text-on-accent tabular-nums"
                    aria-label={texts.selected.replace("{n}", String(pos + 1))}
                  >
                    {pos + 1}
                  </span>
                ) : (
                  <span className="size-check rounded-box border-icon border-separator" />
                )}
              </span>
            </CardRow>
          );
        })}
      </CardList>
      <AddRow
        variant="button"
        icon={<PersonPlusIcon className="size-icon-sm" />}
        label={texts.addGuest}
        placeholder={texts.guestNamePlaceholder}
        saveLabel={texts.save}
        cancelLabel={texts.cancel}
        onSubmit={addGuest}
      />
    </div>
  );
}
