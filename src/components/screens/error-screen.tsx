import Link from "next/link";
import { CardList, CardRow, GroupedSection } from "@/components/ui/card-list";
import { PrimaryButton } from "@/components/ui/form-controls";
import { ScreenHeader } from "@/components/ui/screen-header";

type Props = {
  title: string;
  text: string;
  homeLabel: string;
  /** Retry button (error boundary only); not-found pages have none. */
  retry?: { label: string; onRetry: () => void };
};

/** Shared layout of the error and not-found pages: never a blank page, always a way back. */
export function ErrorScreen({ title, text, homeLabel, retry }: Props) {
  return (
    <main className="flex min-h-dvh flex-col pt-safe pb-safe">
      <ScreenHeader title={<h1 className="fluid-text-lg">{title}</h1>} />
      <GroupedSection>
        <CardList>
          <CardRow className="justify-center text-center text-fg-muted">{text}</CardRow>
          {retry && (
            <CardRow className="justify-center">
              <PrimaryButton type="button" onClick={retry.onRetry}>
                {retry.label}
              </PrimaryButton>
            </CardRow>
          )}
          <CardRow className="justify-center">
            <Link href="/" className="flex min-h-touch w-full items-center justify-center text-accent">
              {homeLabel}
            </Link>
          </CardRow>
        </CardList>
      </GroupedSection>
    </main>
  );
}
