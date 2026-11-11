import type { Page } from "@playwright/test";
import type { ModeId } from "@/domain/game";
import { de } from "@/i18n/de";

const t = de.newGame;
const g = de.game;
/** Accessible name of a choice menu trigger: label and value as shown ("Startpunktzahl 501", WCAG 2.5.3). */
export const choice = (label: string, value: string | number) => `${label} ${String(value)}`;
/**
 * A player's row in a setup or a player panel on the scoring screen: the button that shows the name
 * (controls are named by their visible text); `pressed` narrows to selected or not.
 */
export const playerRow = (page: Page, name: string, pressed?: boolean) =>
  page.getByRole("button", pressed === undefined ? {} : { pressed }).filter({ has: page.getByText(name, { exact: true }) });
/** The victory screen names the winner as its heading ("Sieger" above it). */
export const winner = (page: Page, name: string) => page.getByRole("heading", { name, exact: true });
/** A player's row in the result card of the victory screen (place, name, darts, rest or points). */
export const resultRow = (page: Page, name: string) =>
  page.getByRole("list", { name: g.result }).getByRole("listitem").filter({ hasText: name });

/** Key sequences used across the tests (names as on the keypad). */
export const K = {
  T180: [g.triple, "20", g.triple, "20", g.triple, "20"],
  MISS: ["0", "0", "0"],
  /** 121 with single out. */
  OUT121: [g.triple, "20", g.triple, "20", "1"],
};

export type MatchOptions = {
  startScore?: 301;
  singleOut?: boolean;
  /** Best of legs (3, 5 …). */
  legs?: number;
  perPlayer?: boolean;
  /** Screenshot name of the filled-in setup (docs/screenshots). */
  beforeStart?: () => Promise<void>;
};

/** Fills in the setup of a mode and starts the match; players in throwing order. */
export async function startMatch(page: Page, mode: ModeId, players: string[], o: MatchOptions = {}) {
  await page.goto(`/new/${mode}`);
  for (const name of players) await playerRow(page, name, false).click();
  await chooseRules(page, o);
  for (let n = 1; n < (o.legs ?? 1); n += 2) await page.getByRole("button", { name: `${t.bestOfLegs} ${t.more}` }).click();
  if (o.perPlayer) {
    await page.getByRole("button", { name: choice(t.inputMode, t.inputModes.single) }).click();
    await page.getByRole("button", { name: t.inputModes["per-player"] }).click();
  }
  await o.beforeStart?.();
  await page.getByRole("button", { name: t.start }).click();
  await page.waitForURL(/\/match\//);
}

/** 301 and single out in the X01 setup (also used by the tournament setup). */
export async function chooseRules(page: Page, o: Pick<MatchOptions, "startScore" | "singleOut">) {
  if (o.singleOut) {
    await page.getByRole("button", { name: choice(t.outRule, t.outNames.double) }).click();
    await page.getByRole("button", { name: t.outNames.single, exact: true }).click();
  }
  if (o.startScore) {
    await page.getByRole("button", { name: choice(t.startScore, 501) }).click();
    await page.getByRole("button", { name: String(o.startScore), exact: true }).click();
  }
}

/** Adds a guest in a setup; the new guest is selected right away. */
export async function addGuest(page: Page, name: string) {
  await page.getByRole("button", { name: t.addGuest }).click();
  await page.getByPlaceholder(t.guestNamePlaceholder).fill(name);
  await page.getByPlaceholder(t.guestNamePlaceholder).press("Enter");
  await playerRow(page, name, true).waitFor();
}

/** The scoring screen of one device. */
export function board(page: Page) {
  const key = (name: string) => page.getByRole("button", { name, exact: true });
  /**
   * The status line is "saved" again. Once saved it is empty, so invisible; waiting is for no visible
   * status line saying "saving" or "not saved" (Next keeps a previous page hidden in the DOM).
   */
  const saved = async () => {
    await page.locator('[role=status][data-sync]:not([data-sync="saved"]):visible').first().waitFor({ state: "detached" });
  };
  return {
    key,
    saved,
    /** Taps keys one after another and waits until the visit is saved. */
    async tap(...keys: string[]) {
      for (const k of keys) {
        await key(k).click();
        await page.waitForTimeout(100);
      }
      await saved();
    },
    scores: () => page.locator("[data-score]").allInnerTexts(),
    /** Name of the player on turn (the panel with the active frame). */
    active: async () => (await page.locator(".border-frame-active").first().innerText()).split("\n")[0],
    /** The sync status line (only the scoring screen has `data-sync`; empty, so invisible, while saved). */
    status: () => page.locator("[role=status][data-sync]"),
  };
}

/** A tappable player panel on the scoring screen (ToStart); small panels (3+ players) show the first five letters of the name. */
export const panelOf = (page: Page, name: string) => page.getByRole("button", { name: new RegExp(`^${name.slice(0, 5)}`) });
