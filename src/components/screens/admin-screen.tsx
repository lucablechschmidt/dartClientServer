import { GroupedSection } from "@/components/ui/card-list";
import { isGuest, type Player, type PlayerResult, type Session } from "@/domain/player";
import type { Texts } from "@/i18n/de";
import { GamesAdminSection, type AdminMatchPage } from "./account/games-admin-section";
import { GuestsAdminSection } from "./account/guests-admin-section";
import { InviteSection } from "./account/invite-section";
import { PlayersAdminSection } from "./account/players-admin-section";
import type { InviteLink } from "./account/types";
import type { TournamentListItem } from "./tournament/tournament-list";

type CleanupResult = { ok: true } | { ok: false; reason: keyof Texts["account"]["admin"]["cleanup"]["errors"] };

type Props = {
  session: Session;
  players: Player[];
  tournaments: TournamentListItem[];
  matches: AdminMatchPage;
  now: number;
  texts: Texts["account"];
  /** For the games list: relative times, mode and format names. */
  listTexts: { overview: Texts["overview"]; modes: Texts["gameMenu"]["modes"]; formats: Texts["tournaments"]["formats"] };
  onCreateInvite: () => Promise<InviteLink>;
  onCreatePasswordInvite: (playerId: string) => Promise<InviteLink | null>;
  onDeletePlayer: (formData: FormData) => Promise<PlayerResult>;
  onPromoteGuest: (playerId: string) => Promise<PlayerResult>;
  onDeleteMatch: (id: string) => Promise<CleanupResult>;
  onDeleteTournament: (id: string) => Promise<CleanupResult>;
  onLoadMoreMatches: (offset: number) => Promise<AdminMatchPage>;
};

/** Admin tab ("Verwaltung"), only for admins: invite, players (login, reset, delete), today's guests, games and tournaments. */
export function AdminScreen({
  session,
  players,
  tournaments,
  matches,
  now,
  texts,
  listTexts,
  onCreateInvite,
  onCreatePasswordInvite,
  onDeletePlayer,
  onPromoteGuest,
  onDeleteMatch,
  onDeleteTournament,
  onLoadMoreMatches,
}: Props) {
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
      <GamesAdminSection
        tournaments={tournaments}
        matches={matches}
        now={now}
        texts={texts}
        overviewTexts={listTexts.overview}
        modeNames={listTexts.modes}
        tournamentFormats={listTexts.formats}
        onDeleteMatch={onDeleteMatch}
        onDeleteTournament={onDeleteTournament}
        onLoadMore={onLoadMoreMatches}
      />
    </GroupedSection>
  );
}
