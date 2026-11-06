import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ACHIEVEMENTS } from "@/domain/achievements/types";
import { de } from "@/i18n/de";
import { AchievementBanner, AchievementsSection } from "./achievements";

const t = de.achievements;
const DAY = 24 * 60 * 60 * 1000;
const LABELS = [...Array.from({ length: 20 }, (_, i) => `D${i + 1}`), "Bull"];
const steps = LABELS.map((label) => ({ label, done: ["D16", "D20", "Bull"].includes(label) }));
const items = ACHIEVEMENTS.map((key) => ({
  key,
  earnedAt: key === "180" ? 0 : null,
  ...(key === "all-finishes" ? { progress: { done: 3, of: 21, steps } } : {}),
}));

describe("AchievementsSection (M10)", () => {
  it("the count, then every achievement: earned with its time, open with how to get it, progress for all finishes", () => {
    render(<AchievementsSection items={items} texts={t} overviewTexts={de.overview} now={2 * DAY} />);
    expect(screen.getByText(t.count.replace("{n}", "1").replace("{of}", String(ACHIEVEMENTS.length)))).toBeInTheDocument();
    const list = screen.getByRole("list", { name: t.title });
    const earned = within(list).getByRole("listitem", { name: t.items["180"].name });
    expect(earned).toHaveTextContent(t.earned.replace("{when}", de.overview.daysAgo.replace("{n}", "2")));
    const open = within(list).getByRole("listitem", { name: t.items.shanghai.name });
    expect(open).toHaveTextContent(t.items.shanghai.how);
    expect(within(list).getByRole("progressbar", { name: t.items["all-finishes"].name })).toHaveAttribute("aria-valuenow", "3");
  });

  it("a counted achievement folds open and lists the missing doubles, then the done ones", async () => {
    render(<AchievementsSection items={items} texts={t} overviewTexts={de.overview} now={0} />);
    const row = screen.getByRole("listitem", { name: t.items["all-finishes"].name });
    const toggle = within(row).getByRole("button");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(row).queryByRole("list")).toBeNull();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const missing = within(row).getByRole("list", { name: t.missing.replace("{n}", "18") });
    expect(
      within(missing)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(LABELS.filter((l) => !["D16", "D20", "Bull"].includes(l)));
    const done = within(row).getByRole("list", { name: t.done.replace("{n}", "3") });
    expect(
      within(done)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["D16", "D20", "Bull"]);
    await userEvent.click(toggle);
    expect(within(row).queryByRole("list")).toBeNull();
    // Achievements without steps do not fold.
    expect(within(screen.getByRole("listitem", { name: t.items.shanghai.name })).queryByRole("button")).toBeNull();
  });
});

describe("AchievementBanner (M10)", () => {
  it("loads once the game is saved and names what is new per player", async () => {
    const load = vi.fn(() => Promise.resolve([{ playerId: "a", name: "Casey", keys: ["180" as const, "shanghai" as const] }]));
    const { rerender } = render(<AchievementBanner load={load} ready={false} texts={t} />);
    expect(load).not.toHaveBeenCalled();
    rerender(<AchievementBanner load={load} ready texts={t} />);
    const banner = await screen.findByRole("region", { name: t.title });
    expect(banner).toHaveTextContent(t.banner.replace("{name}", "Casey"));
    expect(banner).toHaveTextContent(`${t.items["180"].name} · ${t.items.shanghai.name}`);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  });

  it("nothing new: nothing shown", async () => {
    const load = vi.fn(() => Promise.resolve([]));
    render(<AchievementBanner load={load} ready texts={t} />);
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(screen.queryByRole("region", { name: t.title })).toBeNull();
  });
});
