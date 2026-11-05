import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { de } from "@/i18n/de";
import { GamesAdminSection, type AdminMatchRow } from "./games-admin-section";

const t = de.account.admin.cleanup;
const confirm = de.account.admin.confirm;
const row = (id: string, names: string[], extra: Partial<AdminMatchRow> = {}): AdminMatchRow => ({
  id,
  mode: "x01",
  names,
  status: "finished",
  startedAt: 0,
  isTournament: false,
  ...extra,
});

function show(overrides: Partial<Parameters<typeof GamesAdminSection>[0]> = {}) {
  const props = {
    tournaments: [{ id: "t1", name: "Freitag", format: "knockout" as const, players: ["Casey", "Sam"], winner: null }],
    matches: { items: [row("m1", ["Casey", "Sam"]), row("m2", ["Kim", "Lou"], { isTournament: true, status: "running" })], hasMore: true },
    now: 60_000,
    texts: de.account,
    overviewTexts: de.overview,
    modeNames: de.gameMenu.modes,
    tournamentFormats: de.tournaments.formats,
    onDeleteMatch: vi.fn(() => Promise.resolve({ ok: true as const })),
    onDeleteTournament: vi.fn(() => Promise.resolve({ ok: true as const })),
    onLoadMore: vi.fn(() => Promise.resolve({ items: [row("m3", ["Noa", "Max"])], hasMore: false })),
    ...overrides,
  };
  render(<GamesAdminSection {...props} />);
  return props;
}
const open = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: new RegExp(`^${t.title}`) }));

describe("GamesAdminSection", () => {
  it("folded at first; open it lists tournaments and games with status and the tournament mark", async () => {
    const user = userEvent.setup();
    show();
    expect(screen.queryByText("Freitag")).toBeNull();
    await open(user);
    expect(within(screen.getByRole("list", { name: t.tournaments })).getByText("Freitag")).toBeInTheDocument();
    const games = screen.getByRole("list", { name: t.matches });
    expect(within(games).getByText("Casey · Sam")).toBeInTheDocument();
    expect(within(games).getByText(new RegExp(t.tournamentGame))).toBeInTheDocument();
    expect(within(games).getByText(new RegExp(t.status.running))).toBeInTheDocument();
  });

  it("a game goes after the second tap and leaves the list", async () => {
    const user = userEvent.setup();
    const props = show();
    await open(user);
    const games = screen.getByRole("list", { name: t.matches });
    const first = within(games).getAllByRole("listitem")[0];
    await user.click(within(first).getByRole("button", { name: t.deleteMatch }));
    expect(props.onDeleteMatch).not.toHaveBeenCalled();
    await user.click(within(first).getByRole("button", { name: confirm }));
    expect(props.onDeleteMatch).toHaveBeenCalledWith("m1");
    await waitFor(() => expect(within(games).queryByText("Casey · Sam")).toBeNull());
  });

  it("a tournament goes after the second tap; an error is shown at its row", async () => {
    const user = userEvent.setup();
    const props = show({ onDeleteTournament: vi.fn(() => Promise.resolve({ ok: false as const, reason: "not-found" as const })) });
    await open(user);
    await user.click(screen.getByRole("button", { name: t.deleteTournament }));
    await user.click(screen.getByRole("button", { name: confirm }));
    expect(props.onDeleteTournament).toHaveBeenCalledWith("t1");
    expect(await screen.findByText(t.errors["not-found"])).toBeInTheDocument();
  });

  it("more loads the next page after the shown games", async () => {
    const user = userEvent.setup();
    const props = show();
    await open(user);
    await user.click(screen.getByRole("button", { name: t.more }));
    expect(props.onLoadMore).toHaveBeenCalledWith(2);
    expect(await screen.findByText("Noa · Max")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t.more })).toBeNull();
  });
});
