import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { PAGE_GROUND, themeInitScript } from "@/components/ui/theme";
import { de } from "@/i18n/de";
import "./globals.css";

export const metadata: Metadata = {
  // Each page sets its own title (R-29): "Statistik · Darts Scorer".
  title: { default: de.app.title, template: `%s · ${de.app.title}` },
  description: de.app.description,
  // M12 PWA: started from the home screen without the browser bar; the icons come from src/app/icon.png,
  // apple-icon.png and the manifest (app/manifest.ts).
  applicationName: de.app.installName,
  appleWebApp: { capable: true, title: de.app.installName, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Browser bar in the page ground; follows the system scheme (a choice in the account tab cannot reach it).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: PAGE_GROUND.light },
    { media: "(prefers-color-scheme: dark)", color: PAGE_GROUND.dark },
  ],
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
