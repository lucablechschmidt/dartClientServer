import { defineConfig } from "@playwright/test";

/**
 * Browser tests (M6) against the production build: `scripts/e2e-server.sh` starts the standalone
 * server on port 3100 with a fresh database and a test admin. With BASE_URL set (e.g. the container
 * behind Caddy, BASIC_AUTH=user:password) the tests run against that instead and start nothing.
 * One worker: all tests share one database, and the rate-limit test locks the IP, so it runs last.
 */
const PORT = Number(process.env.PORT ?? 3100);
const external = process.env.BASE_URL;
const [user, password] = (process.env.BASIC_AUTH ?? "").split(":");

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["line"]] : [["list"]],
  use: {
    baseURL: external ?? `http://localhost:${String(PORT)}`,
    viewport: { width: 375, height: 667 },
    locale: "de-DE",
    httpCredentials: user ? { username: user, password } : undefined,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "app", testIgnore: /rate-limit/ },
    { name: "rate-limit", testMatch: /rate-limit/, dependencies: ["app"] },
  ],
  webServer: external
    ? undefined
    : {
        command: "./scripts/e2e-server.sh",
        url: `http://127.0.0.1:${String(PORT)}/api/health`,
        reuseExistingServer: false,
        timeout: 60_000,
        env: { PORT: String(PORT) },
      },
});
