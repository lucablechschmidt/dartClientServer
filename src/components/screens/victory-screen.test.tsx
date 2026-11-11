import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { applyMatchDart, newMatch, projectMatch, type Dart, type MatchFormat, type MatchState, type ModeId } from "@/domain/game";
import { de } from "@/i18n/de";
import { VictoryScreen } from "./victory-screen";

const g = de.game;
const names = { a: "Casey", b: "Sam", c: "Robin" };
const S = (field: number): Dart => ({ field, type: "single" });
const T = (field: number): Dart => ({ field, type: "triple" });
const MISS = [S(0), S(0), S(0)];

function played(players: string[], darts: Dart[], o: { mode?: ModeId; format?: MatchFormat; start?: number } = {}): MatchState {
  const m = newMatch(
    players,
    { startScore: o.start ?? 40, inRule: "single", outRule: "single" },
    o.format ?? { legsToWinSet: 1, setsToWinMatch: 1 },
    0,
    o.mode,
  );
  return darts.reduce((s, d) => {
    const r = applyMatchDart(s, d);
    if (!r.ok) throw new Error(r.reason);
    return r.value;
  }, m);
}

const show = (m: MatchState, extra: Partial<Parameters<typeof VictoryScreen>[0]> = {}) =>
  render(
    <VictoryScreen
      view={projectMatch(m, names)}
      texts={g}
      onUndoWinningDart={vi.fn()}
      onRestart={vi.fn(async () => {})}
      onPlayOut={null}
      pending={false}
      {...extra}
    />,
  );

describe("VictoryScreen (design VictoryScreen1v1 / VictoryScreenMultiplayer)", () => {
  it("X01 1 vs 1 over several legs: legs big, average and highest visit over every leg, no darts row", () => {
    // leg 1: Casey 20 + 20 out; leg 2 (Sam starts): Sam misses, Casey 40 out
    show(played(["a", "b"], [S(20), S(20), ...MISS, S(20), S(20)], { format: { legsToWinSet: 2, setsToWinMatch: 1 } }));
    expect(screen.getByText(g.winner)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Casey" })).toBeInTheDocument();
    const table = screen.getByRole("table", { name: g.result });
    const row = (label: string) => within(table).getByRole("rowheader", { name: label }).closest("tr");
    expect(row(g.legs)).toHaveTextContent(/^2.*0$/);
    expect(row(g.perVisit)).toHaveTextContent(/^40\.00.*0\.00$/);
    expect(row(g.highestVisit)).toHaveTextContent(/^40.*0$/);
    expect(within(table).queryByRole("rowheader", { name: g.darts })).toBeNull();
  });

  it("X01 1 vs 1 in one leg: no headline, the darts as a row", () => {
    show(played(["a", "b"], [S(20), S(20)]));
    const table = screen.getByRole("table", { name: g.result });
    expect(within(table).getByRole("rowheader", { name: g.darts })).toBeInTheDocument();
    expect(within(table).queryByRole("rowheader", { name: g.legs })).toBeNull();
  });

  it("X01 with three: winner's figures, everyone else with place, darts, average and rest; play-out offered", async () => {
    const user = userEvent.setup();
    const onPlayOut = vi.fn();
    // everyone 20 in the first visit; Casey checks out, then Sam; Robin is left with 20
    const m = played(["a", "b", "c"], [S(20), S(0), S(0), S(20), S(0), S(0), S(20), S(0), S(0), S(20), S(20)], { start: 40 });
    show(m, { onPlayOut });
    expect(screen.getByRole("group", { name: g.darts })).toHaveTextContent("4");
    expect(screen.getByRole("group", { name: g.perVisit })).toBeInTheDocument();
    const rows = within(screen.getByRole("list", { name: g.result })).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([
      `2Sam${g.dartCount.replace("{n}", "4")} · ${g.averageOf.replace("{n}", "20.00")}${g.checkedOut}`,
      `3Robin${g.dartCount.replace("{n}", "3")} · ${g.averageOf.replace("{n}", "20.00")}${g.restOf.replace("{n}", "20")}`,
    ]);
    await user.click(screen.getByRole("button", { name: g.playOut }));
    expect(onPlayOut).toHaveBeenCalledTimes(1);
  });

  it("Cricket: only the darts on top, the loser's open fields and points", () => {
    const closeAll = [T(15), T(16), T(17), ...MISS, T(18), T(19), T(20), ...MISS, { field: 25, type: "double" } as Dart, S(25), T(20)];
    show(played(["a", "b"], closeAll, { mode: "cricket" }));
    expect(screen.getByRole("group", { name: g.darts })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: g.perVisit })).toBeNull();
    const row = within(screen.getByRole("list", { name: g.result })).getByRole("listitem");
    expect(row).toHaveTextContent(g.openFields.replace("{fields}", `15 16 17 18 19 20 ${g.bull}`));
    expect(row).toHaveTextContent(g.pointsOf.replace("{n}", "0"));
  });

  it("actions: restart, undo and statistics side by side, home; a tournament game leads back instead", async () => {
    const user = userEvent.setup();
    const onUndoWinningDart = vi.fn();
    const { unmount } = show(played(["a", "b"], [S(20), S(20)]), { onUndoWinningDart, statsHref: "/match/1/stats" });
    expect(screen.getByRole("button", { name: g.restart })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: g.matchStats })).toHaveAttribute("href", "/match/1/stats");
    expect(screen.getByRole("link", { name: g.home })).toHaveAttribute("href", "/");
    await user.click(screen.getByRole("button", { name: g.undoWinningDart }));
    expect(onUndoWinningDart).toHaveBeenCalledTimes(1);
    unmount();
    show(played(["a", "b"], [S(20), S(20)]), { tournamentHref: "/tournaments/7" });
    expect(screen.queryByRole("button", { name: g.restart })).toBeNull();
    expect(screen.getByRole("link", { name: g.toTournament })).toHaveAttribute("href", "/tournaments/7");
  });
});
