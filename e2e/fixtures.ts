import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import { de } from "@/i18n/de";

export { expect };

export const ADMIN = process.env.ADMIN_USER ?? "admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin-secret";
/** Screenshots for docs/screenshots are taken only when SHOTS_DIR is set (scripts/smoke.sh). */
const SHOTS = process.env.SHOTS_DIR;

type Fixtures = {
  /** Short unique suffix for names, so tests never meet each other's players. */
  stamp: string;
  /** A new device (browser context) with the configured viewport, locale and credentials. */
  phone: () => Promise<Page>;
  /** A device logged in as the admin. */
  admin: Page;
  /** Invites a player (admin) and redeems the invite on a new device; returns that device, logged in. */
  register: (name: string, password?: string) => Promise<Page>;
};

/** Any Content-Security-Policy violation in the browser fails the test (architecture.md §10). */
const CSP = /Content Security Policy|Refused to/i;

export const test = base.extend<Fixtures>({
  stamp: async ({}, use) => {
    await use(Date.now().toString(36).slice(-5) + Math.floor(Math.random() * 1296).toString(36));
  },
  phone: async ({ browser, baseURL, viewport, locale, httpCredentials, colorScheme }, use) => {
    const contexts: BrowserContext[] = [];
    const violations: string[] = [];
    await use(async () => {
      const context = await browser.newContext({ baseURL, viewport, locale, httpCredentials, colorScheme });
      contexts.push(context);
      const page = await context.newPage();
      page.on("console", (m) => {
        if (CSP.test(m.text())) violations.push(m.text());
      });
      return page;
    });
    for (const c of contexts) await c.close();
    expect(violations, "CSP violations").toEqual([]);
  },
  admin: async ({ phone }, use) => {
    const page = await phone();
    await login(page, ADMIN, ADMIN_PASSWORD);
    await use(page);
  },
  register: async ({ admin, phone }, use) => {
    await use(async (name, password = `passwort-${name}`) => {
      const page = await phone();
      await page.goto(await inviteLink(admin));
      await page.getByLabel(de.invite.name).fill(name);
      await page.getByLabel(de.invite.password).fill(password);
      await page.getByLabel(de.invite.passwordRepeat).fill(password);
      await page.getByRole("button", { name: de.invite.register }).click();
      await page.waitForURL((u) => u.pathname === "/");
      return page;
    });
  },
});

export async function login(page: Page, name: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(de.auth.name, { exact: true }).fill(name);
  await page.getByLabel(de.auth.password, { exact: true }).fill(password);
  await page.getByRole("button", { name: de.auth.submit }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

/** A fresh register invite, as a path on the tested server. */
export async function inviteLink(admin: Page): Promise<string> {
  await admin.goto("/admin");
  await admin.getByRole("button", { name: de.account.admin.createInvite }).click();
  return linkPath(admin.locator("a[href*='/einladung/']").first());
}

export async function linkPath(link: ReturnType<Page["locator"]>): Promise<string> {
  await link.waitFor();
  return new URL((await link.getAttribute("href")) ?? "", "http://x").pathname;
}

/** The app's alert; Next adds an empty route announcer with role="alert" that is left out. */
export const alertOf = (page: Page) => page.locator("[role=alert]:not(#__next-route-announcer__)");

export async function shot(page: Page, name: string, fullPage = false) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });
}
