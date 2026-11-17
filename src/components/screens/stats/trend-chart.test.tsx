import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeriesDot, TrendChart } from "./trend-chart";

const slots = [
  { key: "m1", caption: "eins" },
  { key: "m2", caption: "zwei" },
];
const two = [
  { id: "a", name: "Kim", color: 0, values: [1016, 1001] },
  { id: "b", name: "Sam", color: 1, values: [984, null] },
];
const chart = (series = two) =>
  render(<TrendChart label="Elo" slotHeader="Spiel" slots={slots} series={series} format={String} describe={() => ""} />);
const cx = () => [...screen.getByRole("img", { name: "Elo" }).querySelectorAll("circle")].map((c) => Number(c.getAttribute("cx")));

describe("TrendChart", () => {
  it("several series: a legend, each line in its colour, a gap where a series has no value", () => {
    chart();
    const svg = screen.getByRole("img", { name: "Elo" });
    expect([...svg.querySelectorAll("path")].map((p) => p.getAttribute("class"))).toEqual([
      expect.stringContaining("stroke-series-1"),
      expect.stringContaining("stroke-series-2"),
    ]);
    expect(svg.querySelectorAll("circle")).toHaveLength(3);
    expect(screen.getByRole("list")).toHaveTextContent("KimSam");
  });

  it("lays the plot out around the measured label widths once the browser can measure text", () => {
    // jsdom cannot measure text: the chart estimates; a browser reports the drawn width
    const first = chart();
    const estimated = cx()[0];
    first.unmount();
    Object.defineProperty(SVGElement.prototype, "getComputedTextLength", { configurable: true, value: () => 40 });
    try {
      chart();
      const measured = cx();
      // edge 4 + widest y label 40 + gap 6; several series have no value label, so the right edge is 320 − (4 + 6)
      expect(measured[0]).toBe(50);
      expect(measured[1]).toBe(310);
      expect(measured[0]).not.toBe(estimated);
    } finally {
      delete (SVGElement.prototype as { getComputedTextLength?: unknown }).getComputedTextLength;
    }
  });

  it("SeriesDot: the series colour, or an empty ring when the series is not shown", () => {
    const { container } = render(
      <>
        <SeriesDot color={2} />
        <SeriesDot color={null} />
      </>,
    );
    const [on, off] = [...container.querySelectorAll("span")];
    expect(on).toHaveClass("size-swatch", "bg-series-3");
    expect(off).toHaveClass("size-swatch", "border-separator");
  });
});
