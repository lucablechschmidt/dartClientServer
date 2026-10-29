import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": src } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "domain",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["src/components/**/*.test.tsx", "src/app/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/db/**", "src/server/**"],
      exclude: [
        "**/*.test.ts",
        "**/fixtures/**",
        // Thin Next.js glue (server actions, cookies, request context): covered by scripts/smoke-match.mjs
        "src/server/*-actions.ts",
        "src/server/request.ts",
        "src/server/session-cookie.ts",
        "src/server/context.ts",
        "src/server/testing.ts",
      ],
      reporter: ["text-summary", "text"],
      // Enforced in CI (npm run test:coverage); the domain target is the M5 DoD.
      thresholds: {
        "src/domain/**": { statements: 90, branches: 90, functions: 90, lines: 90 },
        "src/db/**": { statements: 85, branches: 75, functions: 85, lines: 85 },
        "src/server/**": { statements: 85, branches: 80, functions: 80, lines: 85 },
      },
    },
  },
});
