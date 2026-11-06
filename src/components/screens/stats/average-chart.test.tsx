import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { de } from "@/i18n/de";
import { AverageChart, niceTicks } from "./average-chart";

const t = de.stats;
const DAY = 24 * 60 * 60 * 1000;
const points = [
  { matchId: "m1", finishedAt: 0, average: 42.5 },
  { matchId: "m2", finishedAt: DAY, average: 61 },
  { matchId: "m3", finishedAt: 2 * DAY, average: 55.25 },
];

describe("AverageChart (M8)", () => {
  it("clean ticks around the values", () => {
    expect(niceTicks(42.5, 61)).toEqual([40, 50, 60, 70]);
    expect(niceTicks(50, 50)).toEqual([40, 50, 60]);
    expect(niceTicks(0, 150.5)).toEqual([0, 50, 100, 150, 200]);
  });

  it("one line point per match, the last value labelled, a table for screen readers", () => {
    render(<AverageChart points={points} texts={t} overviewTexts={de.overview} now={3 * DAY} />);
    const svg = screen.getByRole("img", { name: t.history });
    expect(svg.querySelectorAll("circle")).toHaveLength(3);
    expect(within(svg).getByText("55.25")).toBeInTheDocument();
    expect(within(screen.getByRole("table", { name: t.history })).getAllByRole("row")).toHaveLength(4);
  });

  it("pointing at the chart picks the nearest match", () => {
    render(<AverageChart points={points} texts={t} overviewTexts={de.overview} now={3 * DAY} />);
    const svg = screen.getByRole("img", { name: t.history });
    svg.getBoundingClientRect = () => ({
      left: 0,
      width: 300,
      top: 0,
      height: 150,
      right: 300,
      bottom: 150,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    fireEvent.pointerMove(svg, { clientX: 150, clientY: 50 });
    expect(
      screen.getByText(t.historyPoint.replace("{when}", de.overview.daysAgo.replace("{n}", "2")).replace("{average}", "61.00")),
    ).toBeInTheDocument();
  });

  describe("on wide screens (M14)", () => {
    let report: (width: number, height: number) => void = () => undefined;
    afterEach(() => vi.unstubAllGlobals());
    const stubResizeObserver = () =>
      vi.stubGlobal(
        "ResizeObserver",
        class {
          constructor(cb: ResizeObserverCallback) {
            report = (width, height) => cb([{ contentRect: { width, height } } as ResizeObserverEntry], this as unknown as ResizeObserver);
          }
          observe() {}
          disconnect() {}
        },
      );

    it("draws in measured pixels, so the height and the text size do not grow with the width", () => {
      stubResizeObserver();
      render(<AverageChart points={points} texts={t} overviewTexts={de.overview} now={3 * DAY} />);
      const svg = screen.getByRole("img", { name: t.history });
      expect(svg).toHaveAttribute("viewBox", "0 0 320 160");
      act(() => report(1000, 160));
      expect(svg).toHaveAttribute("viewBox", "0 0 1000 160");
      expect(within(svg).getByText("55.25")).toHaveClass("text-xs");
      // The last point sits at the right edge of the plot, the full width minus the right padding.
      const circles = svg.querySelectorAll("circle");
      expect(Number(circles[circles.length - 1].getAttribute("cx"))).toBeGreaterThan(900);
    });
  });
});
