import { de } from "@/i18n/de";
import { expect, settled, test } from "./fixtures";

const t = de.newGame;

/** The rules per mode: read from src/domain/<mode>/regeln.md in the build, rendered on the server, shown in the setup's pop-over. */
for (const [mode, heading] of [
  ["x01", "Ablauf"],
  ["cricket", "Punkte"],
  ["elimination", "Eliminieren"],
  ["splitscore", "Die Zielfelder"],
] as const) {
  test(`rules of ${mode} in the setup's pop-over`, async ({ admin }) => {
    await admin.goto(`/new/${mode}`);
    await settled(admin);
    await admin.getByRole("button", { name: t.rules }).click();
    const rules = admin.getByRole("region", { name: t.rulesTitle.replace("{mode}", t.modes[mode]) });
    await expect(rules.getByRole("heading", { name: heading })).toBeVisible();
    await expect(rules).not.toContainText(t.rulesSoon);
    await expect(rules).not.toContainText("<!--");
  });
}
