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
    expect(screen.getByRole("group", { name: texts.keypad })).toBeInTheDocument(); // R-29
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
      texts.miss,
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
  it("number keys take exactly one text color: yellow with Double, green with Triple, white otherwise (legacy ButtonsView)", async () => {
    const user = userEvent.setup();
    render(<Keypad onDart={() => {}} onUndo={() => {}} texts={texts} />);
    const twenty = () => screen.getByRole("button", { name: "20" });
    const textColors = () => [...twenty().classList].filter((c) => c.startsWith("text-key-"));
    expect(textColors()).toEqual(["text-key-fg"]);
    await user.click(screen.getByRole("button", { name: texts.double }));
    expect(textColors()).toEqual(["text-key-double"]);
    expect(screen.getByRole("button", { name: texts.bull })).toHaveClass("text-key-double");
    await user.click(screen.getByRole("button", { name: texts.triple }));
    expect(textColors()).toEqual(["text-key-triple"]);
  });
  it("Cricket: X instead of 0 asks for the rest of the visit as misses", async () => {
    const user = userEvent.setup();
    const onMissRest = vi.fn();
    const onDart = vi.fn();
    render(<Keypad onDart={onDart} onUndo={() => {}} onMissRest={onMissRest} texts={texts} layout="cricket" />);
    await user.click(screen.getByRole("button", { name: texts.miss }));
    expect(onMissRest).toHaveBeenCalledTimes(1);
    expect(onDart).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "0" })).toBeNull();
  });
});
