"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/screens/error-screen";
import { de } from "@/i18n/de";

/** Error boundary for every route: the server has logged the error already (digest), the user gets a way out. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error.digest ?? error.message);
  }, [error]);
  const t = de.errorPage;
  return <ErrorScreen title={t.title} text={t.text} homeLabel={t.home} retry={{ label: t.retry, onRetry: reset }} />;
}
