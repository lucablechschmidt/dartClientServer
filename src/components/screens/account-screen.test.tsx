import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { de } from "@/i18n/de";
import { AccountScreen } from "./account-screen";

describe("AccountScreen", () => {
  it("own account first, then three rows to the rankings, the statistics and the achievements", () => {
    render(
      <AccountScreen
        session={{ playerId: "a", name: "Casey", isAdmin: false }}
        texts={{ account: de.account, auth: de.auth, players: de.players }}
        onRename={vi.fn()}
        onChangePassword={vi.fn()}
        onLogout={vi.fn()}
      />,
    );
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
    const logout = screen.getByRole("button", { name: de.auth.logout });
    expect(logout.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
