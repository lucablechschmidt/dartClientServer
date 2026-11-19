import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { de } from "@/i18n/de";
import { SoundPicker } from "./sound-picker";

describe("SoundPicker (M11)", () => {
  beforeEach(() => localStorage.clear());

  it("on by default; Aus stores off, An removes the key again", async () => {
    const user = userEvent.setup();
    render(<SoundPicker labels={de.sound} />);
    expect(screen.getByRole("group", { name: de.sound.label })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: de.sound.on })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: de.sound.off }));
    expect(screen.getByRole("button", { name: de.sound.off })).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("sound")).toBe("off");

    await user.click(screen.getByRole("button", { name: de.sound.on }));
    expect(localStorage.getItem("sound")).toBeNull();
  });
});
