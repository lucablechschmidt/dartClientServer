import type { ReactNode } from "react";
import { BackButton } from "@/components/ui/back-button";
import { PageFrame, type PageWidth } from "@/components/ui/page-frame";

/** A page below the account tab (statistics, rankings, achievements): way back to the account, title, content. */
export function SubPage({ title, back, width, children }: { title: string; back: string; width?: PageWidth; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-bg-grouped px-4 pb-5 text-fg">
      <PageFrame width={width} className="gap-4">
        <div className="flex">
          <BackButton href="/account" label={back} />
        </div>
        <h1 className="text-title font-bold tracking-tight">{title}</h1>
        {children}
      </PageFrame>
    </div>
  );
}
