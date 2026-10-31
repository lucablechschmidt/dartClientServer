import { de } from "@/i18n/de";
import { ADMIN, ADMIN_PASSWORD, alertOf, expect, test } from "./fixtures";

// Runs last (own project in playwright.config.ts): it locks this IP for 15 minutes.
test("after 10 failed logins the 11th attempt is blocked, even with the right password", async ({ phone }) => {
  const page = await phone();
  const attempt = async (password: string) => {
    await page.goto("/login");
    await page.getByLabel(de.auth.name, { exact: true }).fill(ADMIN);
    await page.getByLabel(de.auth.password, { exact: true }).fill(password);
    await page.getByRole("button", { name: de.auth.submit }).click();
  };
  for (let i = 0; i < 10; i++) {
    await attempt("falsch");
    await expect(alertOf(page)).toHaveText(de.auth.errors["invalid-credentials"]);
  }
  await attempt(ADMIN_PASSWORD);
  await expect(alertOf(page)).toHaveText(de.auth.errors["too-many-attempts"]);
});
