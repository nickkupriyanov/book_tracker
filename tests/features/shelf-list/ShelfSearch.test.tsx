import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShelfSearch } from "@/features/shelf-list/ShelfSearch";

describe("ShelfSearch", () => {
  it("renders an input with the supplied placeholder and aria-label", () => {
    render(<ShelfSearch value="" onChange={() => {}} />);
    const input = screen.getByTestId("shelf-search");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("placeholder", "Search title, author, or tag…");
    expect(input).toHaveAttribute("aria-label", "Search books");
  });

  it("displays the supplied value", () => {
    render(<ShelfSearch value="tolkien" onChange={() => {}} />);
    expect(screen.getByTestId("shelf-search")).toHaveValue("tolkien");
  });

  it("calls onChange with each typed character", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ShelfSearch value="" onChange={onChange} />);
    await user.type(screen.getByTestId("shelf-search"), "knuth");
    expect(onChange).toHaveBeenCalledTimes(5);
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([
      "k",
      "n",
      "u",
      "t",
      "h",
    ]);
  });
});
