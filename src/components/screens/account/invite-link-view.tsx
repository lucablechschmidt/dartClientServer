import { QrCode } from "@/components/ui/qr-code";
import type { InviteLink } from "./types";

/** QR code, the link as text, and a hint below; used for invites and password links. */
export function InviteLinkView({ link, label, hint }: { link: InviteLink; label: string; hint: string }) {
  return (
    <div className="flex flex-col gap-2 py-2">
      <QrCode svg={link.svg} label={label} />
      <a href={link.url} className="break-all text-center text-sm text-accent underline">{link.url}</a>
      <p className="text-center text-sm text-fg-muted">{hint}</p>
    </div>
  );
}
