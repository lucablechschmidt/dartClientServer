"use client";

import Link from "next/link";
import { AddRow } from "@/components/ui/add-row";
import { CardList, CardRow } from "@/components/ui/card-list";
import { CheckCircleIcon, CircleIcon } from "@/components/ui/icons";
import { isGuest, type Player } from "@/domain/player";
import type { Texts } from "@/i18n/de";

export type PlayerPickerTexts = Pick<Texts["newGame"], "choosePlayers" | "noPlayers" | "addGuest" | "guestNamePlaceholder" | "guestBadge" | "nameTaken" | "selected" | "select" | "deselect"> & {
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

/**
 * Port of PlayerSelectionView plus a guest row: tap players in order (position + checkmark),
 * with "Gast hinzufügen" as the last row (tap → input field → Enter). Used by every setup screen.
 * Deliberately sits outside the match form because the guest row is a form of its own.
 */
export function PlayerPicker({ players, order, onToggle, onAddGuest, texts }: Props) {
  const fill = (s: string, name: string) => s.replace("{name}", name);
  const addGuest = async (fd: FormData) => {
    const r = await onAddGuest(fd);
    if (!r.ok) return texts.nameTaken;
    onToggle(r.id);
    return null;
  };

  return (
    <CardList label={texts.choosePlayers}>
      {players.length === 0 && (
        <CardRow className="justify-center text-fg-muted">
          <Link href="/players" className="underline">{texts.noPlayers}</Link>
        </CardRow>
      )}
      {players.map((p) => {
        const pos = order.indexOf(p.id);
        const selected = pos >= 0;
        return (
          <CardRow key={p.id} onClick={() => onToggle(p.id)} pressed={selected} label={fill(selected ? texts.deselect : texts.select, p.name)}>
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-base">{p.name}</span>
              {isGuest(p) && <span className="shrink-0 text-sm text-fg-muted">{texts.guestBadge}</span>}
            </span>
            <span className="flex items-center gap-1 text-fg">
              {selected && (
                <span className="grid h-7 w-7 place-items-center rounded-full border-icon border-current text-sm tabular" aria-label={texts.selected.replace("{n}", String(pos + 1))}>
                  {pos + 1}
                </span>
              )}
              {selected ? <CheckCircleIcon className="h-7 w-7" /> : <CircleIcon className="h-7 w-7" />}
            </span>
          </CardRow>
        );
      })}
      <AddRow label={texts.addGuest} placeholder={texts.guestNamePlaceholder} saveLabel={texts.save} cancelLabel={texts.cancel} onSubmit={addGuest} />
    </CardList>
  );
}
