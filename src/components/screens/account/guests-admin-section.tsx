"use client";

import { useState } from "react";
import { CardList, CardRow } from "@/components/ui/card-list";
import { ErrorLine, SectionHeading, TextButton } from "@/components/ui/form-controls";
import type { Player, PlayerError, PlayerResult } from "@/domain/player";
import type { AccountTexts } from "./types";

/** Admin: today's guests with "make permanent" (E12); hidden when there are none. */
export function GuestsAdminSection({
  guests,
  texts,
  onPromoteGuest,
}: {
  guests: Player[];
  texts: AccountTexts;
  onPromoteGuest: (playerId: string) => Promise<PlayerResult>;
}) {
  const [errors, setErrors] = useState<Record<string, PlayerError | undefined>>({});
  if (guests.length === 0) return null;
  const t = texts.admin;
  const promote = async (id: string) => {
    const r = await onPromoteGuest(id);
    setErrors((e) => ({ ...e, [id]: r.ok ? undefined : r.reason }));
  };
  return (
    <div className="flex flex-col gap-2">
      <SectionHeading>{t.guests}</SectionHeading>
      <CardList label={t.guests}>
        {guests.map((p) => (
          <CardRow key={p.id} className="flex-col items-stretch">
            <div className="flex items-center justify-between gap-2">
              <span className="fluid-text-lg truncate">{p.name}</span>
              <TextButton onClick={() => void promote(p.id)}>{t.promoteGuest}</TextButton>
            </div>
            <ErrorLine error={errors[p.id]} texts={texts.errors} />
          </CardRow>
        ))}
      </CardList>
    </div>
  );
}
