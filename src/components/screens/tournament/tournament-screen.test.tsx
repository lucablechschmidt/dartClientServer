import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { de } from "@/i18n/de";
import { TournamentScreen, type TournamentScreenView } from "./tournament-screen";

const base = { group: null, phase: "knockout" as const, matchId: null, matchStatus: null, legs: null };
const view: TournamentScreenView = {
  id: "t1",
  name: "Freitag",
  format: "knockout",
  players: [
    { id: "a", name: "Casey" },
    { id: "b", name: "Sam" },
    { id: "c", name: "Kim" },
  ],
  fixtures: [
    { ...base, id: "k-r1-s1", round: 1, slot: 1, a: "a", b: null, status: "bye", winner: "a" },
    {
      ...base,
      id: "k-r1-s2",
      round: 1,
      slot: 2,
      a: "b",
      b: "c",
      status: "done",
      winner: "c",
      legs: [1, 2],
      matchId: "m1",
      matchStatus: "finished",
    },
    { ...base, id: "k-r2-s1", round: 2, slot: 1, a: "a", b: "c", status: "ready", winner: null },
  ],
  groups: [],
  winner: null,
  canRedraw: false,
  canDelete: true,
};
const t = de.tournaments;
const props = { texts: t, back: de.ui.back, onRedraw: vi.fn(), onDelete: vi.fn() };

describe("TournamentScreen (M9)", () => {
  it("rounds by name, a bye names the bye, a result shows legs and the winner in bold, ready games can be played", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn(() => Promise.resolve({ ok: false as const, reason: "not-ready" as const }));
    render(<TournamentScreen view={view} onStart={onStart} {...props} />);
    const semis = screen.getByRole("list", { name: t.semifinal });
    expect(within(semis).getByText(t.bye)).toBeInTheDocument();
    expect(within(semis).getByText("1:2")).toBeInTheDocument();
    expect(within(semis).getByText("Kim")).toHaveClass("font-semibold");
    const final = screen.getByRole("list", { name: t.final });
    await user.click(within(final).getByRole("button", { name: t.play }));
    expect(onStart).toHaveBeenCalledWith("k-r2-s1");
    expect(await screen.findByText(t.errors["not-ready"])).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t.redraw })).toBeNull();
  });

  it("winner banner, a running game links back into its match, redraw before the first game", () => {
    const running: TournamentScreenView = {
      ...view,
      winner: "c",
      canRedraw: true,
      fixtures: [{ ...view.fixtures[2], matchId: "m2", matchStatus: "running" }],
    };
    render(<TournamentScreen view={running} onStart={vi.fn()} {...props} />);
    expect(screen.getByText(t.winner.replace("{name}", "Kim"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.open })).toHaveAttribute("href", "/match/m2");
    expect(screen.getByRole("button", { name: t.redraw })).toBeInTheDocument();
  });

  it("the group table: place, player, games, wins, legs, average", () => {
    const groups: TournamentScreenView = {
      ...view,
      format: "round-robin",
      fixtures: [],
      groups: [
        {
          group: 1,
          rows: [
            { player: "c", played: 2, wins: 2, losses: 0, legsFor: 4, legsAgainst: 1, average: 55.25 },
            { player: "a", played: 2, wins: 0, losses: 2, legsFor: 1, legsAgainst: 4, average: 40 },
          ],
        },
      ],
    };
    render(<TournamentScreen view={groups} onStart={vi.fn()} {...props} />);
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("1Kim224:155.3");
    expect(rows[2]).toHaveTextContent("2Casey201:440.0");
  });
});
