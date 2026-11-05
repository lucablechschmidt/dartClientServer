import type { ReactNode } from "react";
import { GroupedSection } from "@/components/ui/card-list";
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
  /** M8: own statistics and the rankings per mode, above the account settings. */
  statistics?: ReactNode;
};

/**
 * Account tab, the same for everyone: own statistics and the rankings (M8), then own name, password,
 * logout. The admin tools are in the admin tab.
 */
export function AccountScreen({ session, texts, onRename, onChangePassword, onLogout, statistics }: Props) {
  return (
    <GroupedSection className="flex flex-col gap-5">
      {statistics}
      <OwnAccountSection session={session} texts={texts} onRename={onRename} onChangePassword={onChangePassword} onLogout={onLogout} />
    </GroupedSection>
  );
}
