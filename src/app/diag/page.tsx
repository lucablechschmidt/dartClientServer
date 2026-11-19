import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SubPage } from "@/components/screens/account/sub-page";
import { DiagScreen } from "@/components/screens/diag-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { de } from "@/i18n/de";
import { diagHeaders, diagEnabled } from "@/server/diag";
import { diagPingAction } from "@/server/diag-actions";
import { log } from "@/server/log";
import { clientIp } from "@/server/rate-limit";
import { requireAdmin } from "@/server/request";

export const metadata: Metadata = { title: de.diag.title };

async function Diag() {
  await connection();
  if (!diagEnabled()) notFound();
  await requireAdmin();
  const shown = diagHeaders(await headers());
  const ip = await clientIp();
  log.info("diag.headers", { ...Object.fromEntries(shown.map(([k, v]) => [k, v ?? undefined])), ip });
  return <DiagScreen headers={shown} ip={ip} texts={de.diag} onPing={diagPingAction} />;
}

/** M12 part B (m12-plan §B2): ingress diagnostics, admins only and only with DIAG_ENABLED=true. */
export default function DiagPage() {
  return (
    <main className="flex flex-1 flex-col">
      <SubPage title={de.diag.title} back={de.ui.back}>
        <Suspense fallback={<Skeleton label={de.ui.loading} inline />}>
          <Diag />
        </Suspense>
      </SubPage>
    </main>
  );
}
