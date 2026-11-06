import { CardLinkRow, CardList, GroupedSection } from "@/components/ui/card-list";
import type { PasswordFormState, PlayerResult, Session } from "@/domain/player";
import type { Texts } from "@/i18n/de";
import { OwnAccountSection } from "./account/own-account-section";
import type { InviteLink } from "./account/types";

export type { InviteLink };

type Props = {
  session: Session;
  texts: { account: Texts["account"]; auth: Texts["auth"]; players: Texts["players"] };
  onRename: (formData: FormData) => Promise<PlayerResult>;
  onChangePassword: (prev: PasswordFormState, formData: FormData) => Promise<PasswordFormState>;
  onLogout: () => Promise<void>;
};

/**
 * Account tab, the same for everyone: own name, password, logout, then the rows to the rankings, the
 * own statistics and the own achievements (each a page of its own). The admin tools are in the admin tab.
 */
export function AccountScreen({ session, texts, onRename, onChangePassword, onLogout }: Props) {
  const p = texts.account.pages;
  return (
    <GroupedSection className="flex flex-col gap-5">
      <OwnAccountSection session={session} texts={texts} onRename={onRename} onChangePassword={onChangePassword} onLogout={onLogout} />
      <CardList label={texts.account.more}>
        <CardLinkRow href="/account/rankings" label={p.rankings} />
        <CardLinkRow href="/account/stats" label={p.stats} />
        <CardLinkRow href="/account/achievements" label={p.achievements} />
      </CardList>
    </GroupedSection>
  );
}
