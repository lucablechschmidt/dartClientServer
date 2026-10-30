"use client";

import { useState } from "react";
import { AddRow } from "@/components/ui/add-row";
import { CardList, CardRow, GroupedSection } from "@/components/ui/card-list";
import { ErrorLine, SectionHeading, TextButton, TextInput } from "@/components/ui/form-controls";
import { WrenchIcon } from "@/components/ui/icons";
import { isGuest, type Player, type PlayerError, type PlayerResult, type Session } from "@/domain/player";
import type { Texts } from "@/i18n/de";

type Props = {
  players: Player[];
  session: Session;
  texts: Texts["players"];
  onAddGuest: (formData: FormData) => Promise<{ ok: true; id: string } | { ok: false; reason: "name-taken" }>;
  onRename: (formData: FormData) => Promise<PlayerResult>;
  onDelete: (formData: FormData) => Promise<PlayerResult>;
};

/**
 * Port of PlayersListView. Regular players are only created by invitation (M3), so this screen
 * only offers adding a guest. The wrench appears where the role may rename: own
 * player, guests, admin everyone. Guests (E12) are in a second card (today's guests).
 */
export function PlayerList({ players, session, texts, onAddGuest, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, PlayerError | undefined>>({});
  const report = (id: string, r: PlayerResult) => setErrors((e) => ({ ...e, [id]: r.ok ? undefined : r.reason }));

  const mayEdit = (p: Player) => session.isAdmin || p.id === session.playerId || isGuest(p);
  const mayDelete = (p: Player) => isGuest(p) || (session.isAdmin && !p.isAdmin && p.id !== session.playerId);
  // Close the row only after the action; an unmount in onSubmit would abort the action.
  const act = (action: (fd: FormData) => Promise<PlayerResult>) => async (fd: FormData) => {
    const r = await action(fd);
    const id = fd.get("id");
    report(typeof id === "string" ? id : "", r);
    if (r.ok) setEditing(null);
  };
  const open = (id: string) => {
    setEditing(id);
    setErrors((e) => ({ ...e, [id]: undefined }));
  };
  const addGuest = async (fd: FormData) => {
    const r = await onAddGuest(fd);
    return r.ok ? null : texts.errors[r.reason];
  };

  const row = (p: Player, deleteLabel: string) =>
    editing === p.id ? (
      <CardRow key={p.id} className="flex-col items-stretch">
        <form className="flex w-full gap-2">
          <input type="hidden" name="id" value={p.id} />
          <TextInput inline name="name" defaultValue={p.name} required maxLength={40} autoFocus aria-label={texts.namePlaceholder} />
          <TextButton type="submit" formAction={act(onRename)}>
            {texts.save}
          </TextButton>
          {mayDelete(p) && (
            <TextButton type="submit" tone="danger" formAction={act(onDelete)}>
              {deleteLabel}
            </TextButton>
          )}
        </form>
        <ErrorLine error={errors[p.id]} texts={texts.errors} />
      </CardRow>
    ) : (
      <CardRow key={p.id}>
        <span className="truncate text-fluid-lg">{p.name}</span>
        {mayEdit(p) ? (
          <button
            type="button"
            onClick={() => open(p.id)}
            aria-label={`${texts.edit}: ${p.name}`}
            className="grid min-h-touch min-w-touch place-items-center text-fg"
          >
            <WrenchIcon className="h-6 w-6" />
          </button>
        ) : (
          <span className="min-h-touch min-w-touch" aria-hidden="true" />
        )}
      </CardRow>
    );

  const regular = players.filter((p) => !isGuest(p));
  const guests = players.filter(isGuest);

  return (
    <GroupedSection className="flex flex-col gap-5">
      <CardList label={texts.title}>
        {regular.length === 0 && <CardRow className="justify-center text-fg-muted">{texts.empty}</CardRow>}
        {regular.map((p) => row(p, texts.delete))}
      </CardList>

      <div className="flex flex-col gap-2">
        <SectionHeading>{texts.guests}</SectionHeading>
        <CardList label={texts.guests}>
          {guests.map((p) => row(p, texts.remove))}
          <AddRow
            label={texts.addGuest}
            placeholder={texts.guestNamePlaceholder}
            saveLabel={texts.save}
            cancelLabel={texts.cancel}
            onSubmit={addGuest}
          />
        </CardList>
      </div>
    </GroupedSection>
  );
}
