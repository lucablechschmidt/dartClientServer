import type { MetadataRoute } from "next";
import { PAGE_GROUND } from "@/components/ui/theme";
import { de } from "@/i18n/de";

/**
 * M12 PWA (m12-plan §5): installable from the browser ("Zum Home-Bildschirm"), starts without the
 * browser bar. No service worker: the offline buffer is the visit queue from M6. The icon is a plain
 * dartboard drawn by `scripts/make-icons.mjs`; it sits inside the maskable safe zone, so one image is
 * both "any" and "maskable".
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: de.app.installName,
    short_name: de.app.installName,
    description: de.app.description,
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: PAGE_GROUND.light,
    theme_color: PAGE_GROUND.light,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
