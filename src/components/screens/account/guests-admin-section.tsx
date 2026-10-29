"use client";

import { useState } from "react";
import { CardList, CardRow } from "@/components/ui/card-list";
import { FormError, SectionHeading, TextButton } from "@/components/ui/form-controls";
import type { Player, PlayerError, PlayerResult } from "@/domain/player";
import type { AccountTexts } from "./types";

/** Admin: today's guests with "Dauerhaft übernehmen" (E12); hidden when there are none. */
export function GuestsAdminSection({ guests, texts, onPromoteGuest }: { guests: Player[]; texts: AccountTexts; onPromoteGuest: (playerId: string) => Promise<PlayerResult> }) {
  const [errors, setErrors] = useState<Record<string, PlayerError | undefined>>({});
  if (guests.length === 0) return null;
  const t = texts.admin;
  return (
    <div className="flex flex-col gap-2">
      <SectionHeading>{t.guests}</SectionHeading>
      <CardList label={t.guests}>
        {guests.map((p) => (
          <CardRow key={p.id} className="flex-col items-stretch">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate fluid-text-lg">{p.name}</span>
              <TextButton
                onClick={async () => {
                  const r = await onPromoteGuest(p.id);
                  setErrors((e) => ({ ...e, [p.id]: r.ok ? undefined : r.reason }));
                }}
              >
                {t.promoteGuest}
              </TextButton>
            </div>
            {errors[p.id] && <FormError>{texts.errors[errors[p.id]!]}</FormError>}
          </CardRow>
        ))}
      </CardList>
    </div>
  );
}
