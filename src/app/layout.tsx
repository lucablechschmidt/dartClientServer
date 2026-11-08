import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { themeInitScript } from "@/components/ui/theme";
import { de } from "@/i18n/de";
import "./globals.css";

export const metadata: Metadata = {
  // Each page sets its own title (R-29): "Statistik · Darts Scorer".
  title: { default: de.app.title, template: `%s · ${de.app.title}` },
  description: de.app.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
