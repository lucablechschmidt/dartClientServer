import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { newLeg } from "@/domain/game";
import { splitscore } from "@/domain/splitscore";
import { x01 } from "@/domain/x01";
import { de } from "@/i18n/de";
import { StandardBoard } from "./standard-board";

const g = de.game;
const rules = { startScore: 501, inRule: "single", outRule: "double" } as const;
const names = { a: "Casey", b: "Sam", c: "Kim" };
const show = (players: string[]) =>
  render(
    <StandardBoard
      board={x01.board(newLeg(players, rules), names)}
      texts={g}
      header={null}
      keypad={<div>keypad</div>}
      turnHint={null}
      onResign={null}
    />,
  );

describe("StandardBoard", () => {
  it("3+ players: the next player is named below the keypad, like in Cricket", () => {
    show(["a", "b", "c"]);
    expect(screen.getByText(g.nextPlayer.replace("{name}", "Sam"))).toBeInTheDocument();
  });
  it("2 players: no next player line", () => {
    show(["a", "b"]);
    expect(screen.queryByText(g.nextPlayer.replace("{name}", "Sam"))).toBeNull();
  });
  it("SplitScore ToStart: 'tap a player' and the first target together", () => {
    render(
      <StandardBoard
        board={splitscore.board(newLeg(["a", "b"], rules, 0, "splitscore"), names)}
        texts={g}
        header={null}
        keypad={null}
        turnHint={null}
        starterHint={g.chooseStarter}
        onResign={null}
      />,
    );
    expect(screen.getByText(`${g.chooseStarter} · ${g.hints.target.replace("{target}", "15")}`)).toBeInTheDocument();
  });
});
