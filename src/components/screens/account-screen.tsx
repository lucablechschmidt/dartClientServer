import { GroupedSection } from "@/components/ui/card-list";
import { isGuest, type PasswordFormState, type Player, type PlayerResult, type Session } from "@/domain/player";
import type { Texts } from "@/i18n/de";
import { GuestsAdminSection } from "./account/guests-admin-section";
import { InviteSection } from "./account/invite-section";
import { OwnAccountSection } from "./account/own-account-section";
import { PlayersAdminSection } from "./account/players-admin-section";
import type { InviteLink } from "./account/types";

export type { InviteLink };

type Props = {
  session: Session;
  /** Filled only for the admin. */
  players: Player[];
  texts: { account: Texts["account"]; auth: Texts["auth"]; players: Texts["players"] };
  onRename: (formData: FormData) => Promise<PlayerResult>;
  onChangePassword: (prev: PasswordFormState, formData: FormData) => Promise<PasswordFormState>;
  onLogout: () => Promise<void>;
  admin: {
    onCreateInvite: () => Promise<InviteLink>;
    onCreatePasswordInvite: (playerId: string) => Promise<InviteLink | null>;
    onDeletePlayer: (formData: FormData) => Promise<PlayerResult>;
    onPromoteGuest: (playerId: string) => Promise<PlayerResult>;
  };
};

/** Account tab: own account for everyone; invite, players and guests sections for the admin. */
export function AccountScreen({ session, players, texts, onRename, onChangePassword, onLogout, admin }: Props) {
  return (
    <GroupedSection className="flex flex-col gap-5">
      <OwnAccountSection session={session} texts={texts} onRename={onRename} onChangePassword={onChangePassword} onLogout={onLogout} />
      {session.isAdmin && (
        <>
          <InviteSection texts={texts.account} onCreateInvite={admin.onCreateInvite} />
          <PlayersAdminSection
            session={session}
            players={players.filter((p) => !isGuest(p))}
            texts={texts.account}
            onCreatePasswordInvite={admin.onCreatePasswordInvite}
            onDeletePlayer={admin.onDeletePlayer}
          />
          <GuestsAdminSection guests={players.filter(isGuest)} texts={texts.account} onPromoteGuest={admin.onPromoteGuest} />
        </>
      )}
    </GroupedSection>
  );
}
