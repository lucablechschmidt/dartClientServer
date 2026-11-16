import { de } from "@/i18n/de";
import { expect, settled, test } from "./fixtures";

const t = de.newGame;

/** The rules per mode: read from src/domain/<mode>/regeln.md in the build, rendered on the server, shown in the setup's pop-over. */
for (const [mode] of [["x01"], ["cricket"], ["elimination"], ["splitscore"]] as const) {
  test(`rules of ${mode} in the setup's pop-over`, async ({ admin }) => {
    await admin.goto(`/new/${mode}`);
    await settled(admin);
    await admin.getByRole("button", { name: t.rules }).click();
    const rules = admin.getByRole("region", { name: t.rulesTitle.replace("{mode}", t.modes[mode]) });
    await expect(rules).not.toContainText(t.rulesSoon);
    await expect(rules).not.toContainText("<!--");
  });
}
