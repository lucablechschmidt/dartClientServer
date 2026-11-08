"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/screens/error-screen";
import { themeInitScript } from "@/components/ui/theme";
import { de } from "@/i18n/de";
import "./globals.css";

/**
 * R-17 (m13-plan.md): an error in the root layout itself (theme script, metadata) replaces the whole
 * document, so this page brings its own html, body, styles and theme instead of Next's English default.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error.digest ?? error.message);
  }, [error]);
  const t = de.errorPage;
  return (
    <html lang="de" className="h-full" suppressHydrationWarning>
      <head>
        <title>{de.app.title}</title>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ErrorScreen title={t.title} text={t.text} homeLabel={t.home} retry={{ label: t.retry, onRetry: retry }} />
      </body>
    </html>
  );
}
