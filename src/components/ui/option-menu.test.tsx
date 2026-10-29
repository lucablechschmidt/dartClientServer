import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OptionMenu } from "./option-menu";

const options = [
  { value: 501, label: "501" },
  { value: 301, label: "301" },
];

describe("OptionMenu", () => {
  it("shows the current value, opens the list on tap and reports the picked option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<OptionMenu name="startScore" options={options} value={501} onChange={onChange} title="Punkte" />);
    const pill = screen.getByRole("button", { name: "Punkte: 501" });
    expect(container.querySelector('input[name="startScore"]')).toHaveValue("501");
    expect(screen.queryByRole("list")).toBeNull();
    await user.click(pill);
    await user.click(screen.getByRole("button", { name: "301" }));
    expect(onChange).toHaveBeenCalledWith(301);
    expect(screen.queryByRole("list")).toBeNull();
  });
  it("disabled keeps the list closed", async () => {
    const user = userEvent.setup();
    render(<OptionMenu name="sets" options={[{ value: 1, label: "1" }]} value={1} onChange={() => {}} title="Sets" disabled />);
    await user.click(screen.getByRole("button", { name: "Sets: 1" }));
    expect(screen.queryByRole("list")).toBeNull();
  });
});
