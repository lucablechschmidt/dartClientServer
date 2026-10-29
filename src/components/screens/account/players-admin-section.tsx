"use client";

import { useState } from "react";
import { CardList, CardRow } from "@/components/ui/card-list";
import { FormError, SectionHeading, TextButton } from "@/components/ui/form-controls";
import { useConfirmTap } from "@/components/ui/use-confirm-tap";
import type { Player, PlayerError, PlayerResult, Session } from "@/domain/player";
import { InviteLinkView } from "./invite-link-view";
import type { AccountTexts, InviteLink } from "./types";

type Props = {
  session: Session;
  players: Player[];
  texts: AccountTexts;
  onCreatePasswordInvite: (playerId: string) => Promise<InviteLink | null>;
  onRemoveLogin: (playerId: string) => Promise<PlayerResult>;
  onDeletePlayer: (formData: FormData) => Promise<PlayerResult>;
};

/**
 * Admin: every regular player with login state; create login or reset password (QR code),
 * remove login, delete player. Never for the admin themself or other admins (§1 of the M3 plan).
 */
export function PlayersAdminSection({ session, players, texts, onCreatePasswordInvite, onRemoveLogin, onDeletePlayer }: Props) {
  const t = texts.admin;
  const confirm = useConfirmTap();
  const [errors, setErrors] = useState<Record<string, PlayerError | undefined>>({});
  const [passwordInvite, setPasswordInvite] = useState<{ playerId: string; link: InviteLink } | null>(null);
  const report = (id: string, r: PlayerResult) => setErrors((e) => ({ ...e, [id]: r.ok ? undefined : r.reason }));
  const deletePlayer = async (id: string) => {
    const fd = new FormData();
    fd.set("id", id);
    report(id, await onDeletePlayer(fd));
  };

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
                <span className="truncate fluid-text-lg">{p.name}</span>
                <span className="shrink-0 text-sm text-fg-muted">{p.isAdmin ? t.badges.admin : p.hasLogin ? t.badges.login : t.badges.noLogin}</span>
              </div>
              <div className="flex flex-wrap gap-x-3">
                <TextButton
                  flush
                  onClick={async () => {
                    const link = await onCreatePasswordInvite(p.id);
                    setPasswordInvite(link ? { playerId: p.id, link } : null);
                  }}
                >
                  {p.hasLogin ? t.resetPassword : t.createLogin}
                </TextButton>
                {p.hasLogin && !protectedPlayer && (
                  <TextButton flush tone="danger" onClick={() => confirm.tap(`login:${p.id}`, async () => report(p.id, await onRemoveLogin(p.id)))}>
                    {confirm.label(`login:${p.id}`, t.removeLogin, t.confirm)}
                  </TextButton>
                )}
                {!protectedPlayer && (
                  <TextButton flush tone="danger" onClick={() => confirm.tap(`player:${p.id}`, () => void deletePlayer(p.id))}>
                    {confirm.label(`player:${p.id}`, t.deletePlayer, t.confirm)}
                  </TextButton>
                )}
              </div>
              {errors[p.id] && <FormError>{texts.errors[errors[p.id]!]}</FormError>}
              {passwordInvite?.playerId === p.id && <InviteLinkView link={passwordInvite.link} label={hint} hint={hint} />}
            </CardRow>
          );
        })}
      </CardList>
    </div>
  );
}
