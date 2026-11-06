import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ACHIEVEMENTS } from "@/domain/achievements/types";
import { de } from "@/i18n/de";
import { AchievementBanner, AchievementsSection } from "./achievements";

const t = de.achievements;
const DAY = 24 * 60 * 60 * 1000;
const items = ACHIEVEMENTS.map((key) => ({
  key,
  earnedAt: key === "180" ? 0 : null,
  ...(key === "all-finishes" ? { progress: { done: 3, of: 21 } } : {}),
}));

describe("AchievementsSection (M10)", () => {
  it("folded: the count; open: every achievement, earned with its time, open with how to get it, progress for all finishes", async () => {
    const user = userEvent.setup();
    render(<AchievementsSection items={items} texts={t} overviewTexts={de.overview} now={2 * DAY} />);
    const fold = screen.getByRole("button", { name: new RegExp(`^${t.title}`) });
    expect(fold).toHaveTextContent(t.count.replace("{n}", "1").replace("{of}", String(ACHIEVEMENTS.length)));
    await user.click(fold);
    const list = screen.getByRole("list", { name: t.title });
    const earned = within(list).getByRole("listitem", { name: t.items["180"].name });
    expect(earned).toHaveTextContent(t.earned.replace("{when}", de.overview.daysAgo.replace("{n}", "2")));
    const open = within(list).getByRole("listitem", { name: t.items.shanghai.name });
    expect(open).toHaveTextContent(t.items.shanghai.how);
    expect(within(list).getByRole("progressbar", { name: t.items["all-finishes"].name })).toHaveAttribute("aria-valuenow", "3");
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
