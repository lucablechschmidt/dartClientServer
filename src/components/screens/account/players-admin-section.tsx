"use client";

import { useState } from "react";
import { CardList, CardRow } from "@/components/ui/card-list";
import { ErrorLine, SectionHeading, TextButton } from "@/components/ui/form-controls";
import { useAsyncAction } from "@/components/ui/use-async-action";
import { useConfirmTap } from "@/components/ui/use-confirm-tap";
import type { Player, PlayerError, PlayerResult, Session } from "@/domain/player";
import { InviteLinkView } from "./invite-link-view";
import type { AccountTexts, InviteLink } from "./types";

type Props = {
  session: Session;
  players: Player[];
  texts: AccountTexts;
  onCreatePasswordInvite: (playerId: string) => Promise<InviteLink | null>;
  onDeletePlayer: (formData: FormData) => Promise<PlayerResult>;
};

/**
 * Admin: every regular player in two lines (name with an admin badge, then the actions): create login
 * or reset password (QR code), delete player. Never for the admin themself or other admins (§1 of the M3 plan).
 */
export function PlayersAdminSection({ session, players, texts, onCreatePasswordInvite, onDeletePlayer }: Props) {
  const t = texts.admin;
  const confirm = useConfirmTap();
  const [errors, setErrors] = useState<Record<string, PlayerError | undefined>>({});
  const [passwordInvite, setPasswordInvite] = useState<{ playerId: string; link: InviteLink } | null>(null);
  const passwordLink = useAsyncAction(onCreatePasswordInvite, (link, id) => setPasswordInvite(link ? { playerId: id, link } : null));
  const remove = useAsyncAction(
    (id: string) => {
      const fd = new FormData();
      fd.set("id", id);
      return onDeletePlayer(fd);
    },
    (r, id) => setErrors((e) => ({ ...e, [id]: r.ok ? undefined : r.reason })),
  );

  return (
    <div className="flex flex-col gap-2">
      <SectionHeading>{t.players}</SectionHeading>
      <CardList label={t.players}>
        {players.map((p) => {
          const protectedPlayer = p.isAdmin || p.id === session.playerId;
          const hint = t.passwordInviteHint.replace("{name}", p.name);
          return (
            <CardRow key={p.id} className="flex-col items-stretch gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-fluid-lg">{p.name}</span>
                {p.isAdmin && <span className="shrink-0 text-sm text-fg-muted">{t.adminBadge}</span>}
              </div>
              <div className="flex flex-wrap gap-x-3">
                <TextButton flush {...passwordLink.rowButton(p.id)} onClick={() => passwordLink.run(p.id)}>
                  {p.hasLogin ? t.resetPassword : t.createLogin}
                </TextButton>
                {!protectedPlayer && (
                  <TextButton
                    flush
                    tone="danger"
                    {...remove.rowButton(p.id)}
                    onClick={() => confirm.tap(`player:${p.id}`, () => remove.run(p.id))}
                  >
                    {confirm.label(`player:${p.id}`, t.deletePlayer, t.confirm)}
                  </TextButton>
                )}
              </div>
              <ErrorLine error={errors[p.id]} texts={texts.errors} />
              {passwordInvite?.playerId === p.id && <InviteLinkView link={passwordInvite.link} label={hint} hint={hint} />}
            </CardRow>
          );
        })}
      </CardList>
    </div>
  );
}
