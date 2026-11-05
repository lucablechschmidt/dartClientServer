import { de } from "@/i18n/de";
import { addGuest } from "./board";
import { expect, shot, test } from "./fixtures";

const c = de.account.admin.cleanup;
const confirm = de.account.admin.confirm;

test("clean-up in the admin tab: a game and a tournament with its games are deleted, also from the overview", async ({ admin, stamp }) => {
  const [G1, G2, T1, T2, cup] = [`G${stamp}`, `K${stamp}`, `T${stamp}`, `U${stamp}`, `Cup ${stamp}`];
  const running = (name: string) => admin.getByRole("list", { name: de.overview.title }).getByRole("link", { name: new RegExp(name) });

  // a game started by mistake
  await admin.goto("/new/x01");
  await addGuest(admin, G1);
  await addGuest(admin, G2);
  await admin.getByRole("button", { name: de.newGame.start }).click();
  await admin.waitForURL(/\/match\//);

  // a test tournament with one game started
  await admin.goto("/tournaments/new");
  await admin.getByLabel(de.tournaments.name).fill(cup);
  await addGuest(admin, T1);
  await addGuest(admin, T2);
  await admin.getByRole("button", { name: de.tournaments.start }).click();
  await admin.waitForURL((u) => /^\/tournaments\/(?!new$)[^/]+$/.test(u.pathname));
  await admin.getByRole("button", { name: de.tournaments.play }).first().click();
  await admin.waitForURL(/\/match\//);

  await admin.goto("/");
  await expect(running(G1)).toHaveCount(1);
  await expect(running(T1)).toHaveCount(1);

  await admin.goto("/admin");
  await admin.getByRole("button", { name: new RegExp(`^${c.title}`) }).click();
  const games = admin.getByRole("list", { name: c.matches });
  const game = games.getByRole("listitem").filter({ hasText: G1 });
  await game.getByRole("button", { name: c.deleteMatch }).click();
  await game.getByRole("button", { name: confirm }).click();
  await expect(games.getByRole("listitem").filter({ hasText: G1 })).toHaveCount(0);

  const tournament = admin.getByRole("list", { name: c.tournaments }).getByRole("listitem").filter({ hasText: cup });
  await shot(admin, "admin-cleanup");
  await tournament.getByRole("button", { name: c.deleteTournament }).click();
  await tournament.getByRole("button", { name: confirm }).click();
  await expect(admin.getByRole("list", { name: c.tournaments }).getByText(cup)).toHaveCount(0);
  await expect(games.getByRole("listitem").filter({ hasText: T1 })).toHaveCount(0);

  await admin.goto("/");
  await expect(running(G1)).toHaveCount(0);
  await expect(running(T1)).toHaveCount(0);
  await admin.goto("/tournaments");
  await expect(admin.getByText(cup)).toHaveCount(0);
});
