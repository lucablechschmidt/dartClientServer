import { Suspense } from "react";
import { InviteScreen } from "@/components/screens/invite-screen";
import { de } from "@/i18n/de";
import { redeemInviteAction } from "@/server/invite-actions";
import { inviteInfo } from "@/server/invite-service";
import { requestDeps } from "@/server/request";

type Props = { params: Promise<{ token: string }> };

async function Invite({ params }: Props) {
  const { token } = await params;
  const info = inviteInfo(await requestDeps(), token);
  return <InviteScreen info={info} texts={de.invite} onRedeem={redeemInviteAction.bind(null, token)} />;
}

/** Redeem an invite (M3): reachable without login, form depending on the kind, notice for an invalid token. */
export default function InvitePage(props: Props) {
  return (
    <main className="flex min-h-dvh flex-col pt-safe pb-safe">
      <Suspense fallback={null}>
        <Invite {...props} />
      </Suspense>
    </main>
  );
}
