import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

describe("Markdown", () => {
  it("paragraphs, headings, lists and bold as the app's elements; a comment line stays invisible", () => {
    const { container } = render(<Markdown text={"<!-- Notiz -->\n\nEinleitung\n\n### Ablauf\n\n- **Eins** zwei\n- drei\n\n1. erste\n"} />);
    expect(screen.getByRole("heading", { name: "Ablauf" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Eins zwei", "drei", "erste"]);
    expect(container.querySelector("strong")).toHaveTextContent("Eins");
    expect(container).not.toHaveTextContent("Notiz");
  });
});
