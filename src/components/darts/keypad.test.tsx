import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { de } from "@/i18n/de";
import { Keypad } from "./keypad";

const texts = de.game;

describe("Keypad", () => {
  it("emits T20 after Triple then 20 and hides Bull while Triple is active", async () => {
    const user = userEvent.setup();
    const onDart = vi.fn();
    render(<Keypad onDart={onDart} onUndo={() => {}} texts={texts} />);
    await user.click(screen.getByRole("button", { name: texts.triple }));
    expect(screen.getByRole("button", { name: texts.triple })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: texts.bull })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "20" }));
    expect(onDart).toHaveBeenCalledWith({ field: 20, type: "triple" });
    expect(screen.getByRole("button", { name: texts.triple })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: texts.bull })).toBeEnabled();
  });
  it("undo calls onUndo and is disabled when nothing can be undone", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    const { rerender } = render(<Keypad onDart={() => {}} onUndo={onUndo} texts={texts} />);
    await user.click(screen.getByRole("button", { name: texts.undo }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    rerender(<Keypad onDart={() => {}} onUndo={onUndo} texts={texts} canUndo={false} />);
    expect(screen.getByRole("button", { name: texts.undo })).toBeDisabled();
  });
  it("canThrow=false locks numbers, Bull and modifiers but leaves Undo", () => {
    render(<Keypad onDart={() => {}} onUndo={() => {}} texts={texts} canThrow={false} />);
    expect(screen.getByRole("button", { name: "20" })).toBeDisabled();
    expect(screen.getByRole("button", { name: texts.bull })).toBeDisabled();
    expect(screen.getByRole("button", { name: texts.triple })).toBeDisabled();
    expect(screen.getByRole("button", { name: texts.undo })).toBeEnabled();
  });
  it("disabled blocks every key", () => {
    render(<Keypad onDart={() => {}} onUndo={() => {}} texts={texts} disabled />);
    expect(screen.getAllByRole("button").every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });
  it("cricket layout: only 0, 15–20, Bull, Double, Triple, Undo (Figma)", async () => {
    const user = userEvent.setup();
    const onDart = vi.fn();
    render(<Keypad onDart={onDart} onUndo={() => {}} texts={texts} layout="cricket" />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "0",
      "15",
      "16",
      "17",
      "18",
      "19",
      "20",
      texts.bull,
      texts.double,
      texts.triple,
      texts.undo,
    ]);
    await user.click(screen.getByRole("button", { name: texts.triple }));
    await user.click(screen.getByRole("button", { name: "20" }));
    expect(onDart).toHaveBeenCalledWith({ field: 20, type: "triple" });
  });
});
