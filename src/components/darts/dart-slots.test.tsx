import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DartSlotView } from "@/domain/game";
import { DartSlots } from "./dart-slots";

const slot = (s: Partial<DartSlotView>): DartSlotView => ({ label: null, isCurrent: false, isOverthrown: false, previous: null, ...s });

describe("DartSlots", () => {
  it("shows the previous visit faintly in empty slots only", () => {
    const { container } = render(
      <DartSlots
        slots={[slot({ label: "T20", previous: null }), slot({ previous: "5", isCurrent: true }), slot({ previous: "T20" })]}
        isBust={false}
        label="Aufnahme"
      />,
    );
    const items = [...container.querySelectorAll("li")];
    expect(items.map((li) => li.textContent)).toEqual(["T20", "5", "T20"]);
    expect(items.map((li) => li.querySelector("[data-previous]") !== null)).toEqual([false, true, true]);
    expect(items[1].querySelector("[data-previous]")).toHaveAttribute("aria-hidden", "true");
  });
});
