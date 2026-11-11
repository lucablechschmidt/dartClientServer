import type { NextConfig } from "next";

/**
 * Security headers (architecture.md §10). Inline scripts stay allowed: Next.js streams its RSC payload
 * as inline scripts and the theme init script runs before first paint; a per-request nonce would force
 * the root layout to be dynamic and break partial prerendering. Everything external is blocked.
 */
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // The rules of each mode are read at runtime (src/server/rules.ts); copy them into the standalone build.
  outputFileTracingIncludes: { "/new/[mode]": ["./src/domain/*/regeln.md"] },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Dev only: the dev server blocks /_next/* for any hostname but localhost, so a phone on the
  // LAN gets server-rendered pages without hydration (every onClick button is dead). List the
  // networks the dev machine is reached from; no effect on the production build.
  allowedDevOrigins: ["141.100.*.*", "192.168.*.*", "10.*.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
