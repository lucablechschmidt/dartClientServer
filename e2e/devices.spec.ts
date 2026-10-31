import { de } from "@/i18n/de";
import { board, K, startMatch } from "./board";
import { ADMIN, expect, test } from "./fixtures";

const g = de.game;

test("two devices (M4, E13): each on their own phone, live updates, locks and cancel", async ({ admin, register, stamp }) => {
  const A = `A${stamp}`;
  const pageA = await register(A);
  await startMatch(admin, "x01", [ADMIN, A], { perPlayer: true });
  const url = admin.url();
  const host = board(admin);
  const a = board(pageA);

  await pageA.goto("/");
  await pageA
    .getByRole("list", { name: de.overview.title })
    .getByRole("link", { name: new RegExp(`${ADMIN} · ${A}`) })
    .click();
  await pageA.waitForURL(url);
  await expect(a.key("20")).toBeDisabled();
  await expect(pageA.getByText(g.turnOf.replace("{name}", ADMIN))).toBeVisible();

  await host.tap(...K.T180);
  await expect(pageA.locator("[data-score]").first()).toHaveText("321"); // live via SSE
  await expect(a.key("20")).toBeEnabled();
  await expect(host.key("20")).toBeDisabled();
  await expect(a.key(g.undo)).toBeDisabled(); // the last visit is the host's

  await a.tap("20", "20", "20");
  await expect(admin.locator("[data-score]").nth(1)).toHaveText("441");

  await admin.getByRole("button", { name: g.cancel }).click();
  await admin.getByRole("dialog").getByRole("button", { name: g.cancelConfirm }).click();
  await admin.waitForURL((u) => u.pathname === "/");
  await expect(pageA.getByText(g.closed)).toBeVisible();
});
