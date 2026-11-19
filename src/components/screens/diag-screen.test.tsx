import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { de } from "@/i18n/de";
import { DiagScreen, tickGaps } from "./diag-screen";

const t = de.diag;

describe("tickGaps", () => {
  it("gaps between arrivals, rounded; none for fewer than two", () => {
    expect(tickGaps([])).toEqual([]);
    expect(tickGaps([5])).toEqual([]);
    expect(tickGaps([0, 1000.4, 2001, 2999.6])).toEqual([1000, 1001, 999]);
  });
});

describe("DiagScreen (m12-plan §B2)", () => {
  it("lists the headers with missing ones marked and the IP of the rate limit", () => {
    render(
      <DiagScreen
        headers={[
          ["x-forwarded-for", "100.64.0.1"],
          ["x-forwarded-host", null],
        ]}
        ip="100.64.0.1"
        texts={t}
        onPing={vi.fn()}
      />,
    );
    const list = screen.getByRole("list", { name: t.headers });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["x-forwarded-for100.64.0.1", `x-forwarded-host${t.missing}`, `${t.ip}100.64.0.1`]);
  });

  it("the Server Action button reports ok or failed", async () => {
    const user = userEvent.setup();
    const onPing = vi.fn().mockResolvedValueOnce({ ok: true, at: 1 }).mockRejectedValueOnce(new Error("origin"));
    render(<DiagScreen headers={[]} ip="local" texts={t} onPing={onPing} />);
    await user.click(screen.getByRole("button", { name: t.runAction }));
    expect(await screen.findByRole("status")).toHaveTextContent(/^ok \(\d+ ms\)$/);
    await user.click(screen.getByRole("button", { name: t.runAction }));
    expect(await screen.findByRole("status")).toHaveTextContent(t.actionFailed);
  });
});
