import { GroupedSection } from "@/components/ui/card-list";
import { isGuest, type Player, type PlayerResult, type Session } from "@/domain/player";
import type { Texts } from "@/i18n/de";
import { GuestsAdminSection } from "./account/guests-admin-section";
import { InviteSection } from "./account/invite-section";
import { PlayersAdminSection } from "./account/players-admin-section";
import type { InviteLink } from "./account/types";

type Props = {
  session: Session;
  players: Player[];
  texts: Texts["account"];
  onCreateInvite: () => Promise<InviteLink>;
  onCreatePasswordInvite: (playerId: string) => Promise<InviteLink | null>;
  onDeletePlayer: (formData: FormData) => Promise<PlayerResult>;
  onPromoteGuest: (playerId: string) => Promise<PlayerResult>;
};

/** Admin tab ("Verwaltung"), only for admins: invite, players (login, reset, delete), today's guests. */
export function AdminScreen({ session, players, texts, onCreateInvite, onCreatePasswordInvite, onDeletePlayer, onPromoteGuest }: Props) {
  return (
    <GroupedSection className="flex flex-col gap-5">
      <InviteSection texts={texts} onCreateInvite={onCreateInvite} />
      <PlayersAdminSection
        session={session}
        players={players.filter((p) => !isGuest(p))}
        texts={texts}
        onCreatePasswordInvite={onCreatePasswordInvite}
        onDeletePlayer={onDeletePlayer}
      />
      <GuestsAdminSection guests={players.filter(isGuest)} texts={texts} onPromoteGuest={onPromoteGuest} />
    </GroupedSection>
  );
}
