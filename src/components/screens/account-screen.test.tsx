import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { de } from "@/i18n/de";
import { AccountScreen } from "./account-screen";

const show = () =>
  render(
    <AccountScreen
      session={{ playerId: "a", name: "Casey", isAdmin: false }}
      texts={{ account: de.account, auth: de.auth, players: de.players }}
      onRename={vi.fn()}
      onChangePassword={vi.fn()}
      onLogout={vi.fn()}
    />,
  );

describe("AccountScreen", () => {
  it("the profile is a folded card with the name; open it holds name, password and logout", async () => {
    const user = userEvent.setup();
    show();
    const profile = screen.getByRole("button", { name: new RegExp(`^${de.account.profile}`) });
    expect(profile).toHaveAttribute("aria-expanded", "false");
    expect(profile).toHaveTextContent("Casey");
    expect(screen.queryByRole("button", { name: de.auth.logout })).toBeNull();
    await user.click(profile);
    expect(screen.getByRole("button", { name: de.auth.logout })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: de.account.changePassword })).toBeInTheDocument();
  });

  it("below the profile three rows to the rankings, the statistics and the achievements", () => {
    show();
    const p = de.account.pages;
    const more = screen.getByRole("list", { name: de.account.more });
    expect(
      within(more)
        .getAllByRole("link")
        .map((l) => [l.textContent, l.getAttribute("href")]),
    ).toEqual([
      [p.rankings, "/account/rankings"],
      [p.stats, "/account/stats"],
      [p.achievements, "/account/achievements"],
    ]);
    const profile = screen.getByRole("button", { name: new RegExp(`^${de.account.profile}`) });
    expect(profile.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
