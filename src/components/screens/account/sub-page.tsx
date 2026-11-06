import type { ReactNode } from "react";
import { BackButton } from "@/components/ui/back-button";

/** A page below the account tab (statistics, rankings, achievements): way back to the account, title, content. */
export function SubPage({ title, back, children }: { title: string; back: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-4 bg-bg-grouped px-4 pb-5 text-fg">
      <div className="flex">
        <BackButton href="/account" label={back} />
      </div>
      <h1 className="text-title font-bold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}
