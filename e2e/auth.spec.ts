import { de } from "@/i18n/de";
import { ADMIN, ADMIN_PASSWORD, alertOf, expect, inviteLink, linkPath, login, shot, test } from "./fixtures";

test("security headers on every response", async ({ request }) => {
  const h = (await request.get("/login")).headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h).not.toHaveProperty("x-powered-by");
});

test("without a session everything lands on /login, and after login back where it was", async ({ phone }) => {
  const page = await phone();
  await page.goto("/players");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel(de.auth.name, { exact: true }).fill(ADMIN);
  await page.getByLabel(de.auth.password, { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: de.auth.submit }).click();
  await expect(page).toHaveURL(/\/players$/);
});

test("invites: a taken name is rejected (case C), new players may rename only themselves", async ({ admin, phone, register, stamp }) => {
  const [A, B] = [`A${stamp}`, `B${stamp}`];
  const rejected = await phone();
  await rejected.goto(await inviteLink(admin));
  await rejected.getByLabel(de.invite.name).fill(ADMIN);
  await rejected.getByLabel(de.invite.password).fill("irgendwas1");
  await rejected.getByLabel(de.invite.passwordRepeat).fill("irgendwas1");
  await rejected.getByRole("button", { name: de.invite.register }).click();
  await expect(alertOf(rejected)).toHaveText(de.invite.errors["name-taken"]);

  const pageA = await register(A);
  await register(B);
  await shot(admin, "account-admin");
  const edit = (name: string) => ({ name: `${de.players.edit}: ${name}` });
  await admin.goto("/players");
  await expect(admin.getByRole("button", edit(A))).toHaveCount(1);
  await pageA.goto("/players");
  await expect(pageA.getByRole("button", edit(A))).toHaveCount(1);
  await expect(pageA.getByRole("button", edit(B))).toHaveCount(0);
});

test("a password reset ends the old session; the new password applies", async ({ admin, phone, register, stamp }) => {
  const A = `A${stamp}`;
  const pageA = await register(A);
  await admin.goto("/account");
  const row = admin.getByRole("listitem").filter({ hasText: A });
  await row.getByRole("button", { name: de.account.admin.resetPassword }).click();
  const reset = await phone();
  await reset.goto(await linkPath(row.locator("a[href*='/einladung/']")));
  await expect(reset.getByText(de.invite.forPlayer.replace("{name}", A))).toBeVisible();
  await reset.getByLabel(de.invite.password).fill("neuesPasswortA");
  await reset.getByLabel(de.invite.passwordRepeat).fill("neuesPasswortA");
  await reset.getByRole("button", { name: de.invite.setPassword }).click();
  await reset.waitForURL((u) => u.pathname === "/");

  await pageA.goto("/players");
  await expect(pageA).toHaveURL(/\/login/);
  await login(pageA, A, "neuesPasswortA");
});

test("an unknown match shows the not-found page", async ({ admin }) => {
  await admin.goto("/match/does-not-exist");
  await expect(admin.getByText(de.errorPage.notFoundTitle)).toBeVisible();
});

test("logout: afterwards everything redirects to /login", async ({ admin }) => {
  await admin.goto("/account");
  await admin.getByRole("button", { name: de.auth.logout }).click();
  await admin.waitForURL(/\/login/);
  await admin.goto("/");
  await expect(admin).toHaveURL(/\/login/);
});
