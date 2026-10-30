"use client";

import { useState } from "react";
import { CardList, CardRow } from "@/components/ui/card-list";
import { SectionHeading, TextButton } from "@/components/ui/form-controls";
import { InviteLinkView } from "./invite-link-view";
import type { AccountTexts, InviteLink } from "./types";

/** Admin: create a register invite and show it as QR code. */
export function InviteSection({ texts, onCreateInvite }: { texts: AccountTexts; onCreateInvite: () => Promise<InviteLink> }) {
  const [invite, setInvite] = useState<InviteLink | null>(null);
  const t = texts.admin;
  return (
    <div className="flex flex-col gap-2">
      <SectionHeading>{t.invite}</SectionHeading>
      <CardList label={t.invite}>
        <CardRow className="flex-col items-stretch gap-3">
          <TextButton onClick={() => void onCreateInvite().then(setInvite)}>{t.createInvite}</TextButton>
          {invite && <InviteLinkView link={invite} label={t.createInvite} hint={t.inviteHint} />}
        </CardRow>
      </CardList>
    </div>
  );
}
