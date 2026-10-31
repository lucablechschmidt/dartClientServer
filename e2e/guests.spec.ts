import { de } from "@/i18n/de";
import { addGuest, board, deselect, select } from "./board";
import { alertOf, expect, shot, test } from "./fixtures";

const g = de.game;
const p = de.players;

test("guests (E12): created in the setup, listed for the day, cannot be removed while playing, renamed", async ({
  admin,
  register,
  stamp,
}) => {
  const [A, guest] = [`A${stamp}`, `G${stamp}`];
  await register(A);
  await admin.goto("/new/x01");
  await addGuest(admin, guest);
  await expect(admin.getByRole("button", { name: deselect(guest) })).toContainText(de.newGame.guestBadge);
  await admin.getByRole("button", { name: select(A) }).click();
  await admin.getByRole("button", { name: de.newGame.start }).click();
  await admin.waitForURL(/\/match\//);
  const b = board(admin);
  await b.tap(g.triple, "20", "20", g.triple, "5"); // the guest throws first
  await b.tap(g.triple, "20", "20", g.triple, "5");
  await shot(admin, "match-guest");

  await admin.goto("/new/x01");
  await expect(admin.getByRole("button", { name: select(guest) })).toHaveCount(1);
  await admin.goto("/players");
  await expect(admin.getByRole("list", { name: p.guests }).getByText(guest, { exact: true })).toHaveCount(1);
  await expect(admin.getByRole("list", { name: p.title }).getByText(guest, { exact: true })).toHaveCount(0);

  await admin.getByRole("button", { name: `${p.edit}: ${guest}` }).click();
  await admin.getByRole("button", { name: p.remove }).click();
  await expect(alertOf(admin)).toHaveText(p.errors["player-in-match"]);
  await admin.getByLabel(p.namePlaceholder, { exact: true }).fill(A);
  await admin.getByRole("button", { name: p.save }).click();
  await expect(alertOf(admin)).toHaveText(p.errors["name-taken"]);
  await admin.getByLabel(p.namePlaceholder, { exact: true }).fill(`${guest}x`);
  await admin.getByRole("button", { name: p.save }).click();
  await expect(admin.getByText(`${guest}x`, { exact: true })).toBeVisible();
  await shot(admin, "players-guests");
});

test("overview and cancel (M4): the running match is listed, cancelling asks first and closes it", async ({ admin, stamp }) => {
  const guest = `G${stamp}`;
  await admin.goto("/new/x01");
  await addGuest(admin, guest);
  await admin.getByRole("button", { name: de.newGame.start }).click();
  await admin.waitForURL(/\/match\//);

  await admin.goto("/");
  const running = admin.getByRole("list", { name: de.overview.title });
  await expect(running.getByRole("link", { name: new RegExp(guest) })).toBeVisible();
  await shot(admin, "overview");
  await running.getByRole("link", { name: new RegExp(guest) }).click();
  await admin.waitForURL(/\/match\//);
  const url = admin.url();
  await admin.getByRole("button", { name: g.cancel }).click();
  await admin.getByRole("dialog").getByRole("button", { name: g.cancelBack }).click();
  await expect(admin.getByRole("dialog")).toHaveCount(0);
  await admin.getByRole("button", { name: g.cancel }).click();
  await admin.getByRole("dialog").getByRole("button", { name: g.cancelConfirm }).click();
  await admin.waitForURL((u) => u.pathname === "/");
  await expect(admin.getByRole("link", { name: new RegExp(guest) })).toHaveCount(0);

  await admin.goto(url);
  await expect(admin.getByText(g.closed)).toBeVisible();
  await expect(board(admin).key("20")).toBeDisabled();
});
