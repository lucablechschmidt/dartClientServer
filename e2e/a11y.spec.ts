import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { de } from "@/i18n/de";
import { board, choice, K, startMatch } from "./board";
import { expect, settled, test } from "./fixtures";

const g = de.game;

/**
 * WCAG 2.1 A/AA rules of axe-core; every violation is listed by rule and element when the test fails.
 * color-contrast is left out until the open question on the muted grey and the avatar tints is answered
 * (docs/fragen.md, 8.11.2026): fixing it changes colours everyone sees.
 */
async function noViolations(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(["color-contrast"])
    .analyze();
  const found = violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(found, where).toEqual([]);
}

/** Package F (m13-plan.md §3.6): setup with an open choice menu, scoring screen, confirm sheet, leg victory, account. */
test("no axe violations on the main screens (R-26 … R-29)", async ({ admin, register, stamp }) => {
  const [A, B] = [`A${stamp}`, `B${stamp}`];
  await register(A);
  await register(B);

  await admin.goto("/new/x01");
  await settled(admin);
  await noViolations(admin, "setup");
  await admin.getByRole("button", { name: choice(de.newGame.startScore, 501) }).click();
  await noViolations(admin, "setup with the score menu open");

  await startMatch(admin, "x01", [A, B], { startScore: 301, singleOut: true, legs: 3 });
  const b = board(admin);
  await noViolations(admin, "scoring screen");
  await admin.getByRole("button", { name: g.cancel }).click();
  await noViolations(admin, "confirm sheet");
  await admin.getByRole("dialog").getByRole("button", { name: g.cancelBack }).click();

  await b.tap(...K.T180, ...K.MISS, ...K.OUT121);
  await expect(admin.getByText(g.legWon.replace("{name}", A))).toBeVisible();
  await noViolations(admin, "leg victory");

  await admin.goto("/account");
  await settled(admin);
  await noViolations(admin, "account");
});
