import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShelfSort } from "@/features/shelf-list/ShelfSort";
import { SORT_LABELS, type SortValue } from "@/lib/shelf-sort";

describe("ShelfSort", () => {
  it("renders the trigger with the current label", () => {
    render(<ShelfSort value="recently-added" onChange={vi.fn()} />);
    const trigger = screen.getByTestId("shelf-sort");
    expect(trigger).toHaveTextContent(SORT_LABELS["recently-added"]);
  });

  it("calls onChange with the new SortValue when an option is selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ShelfSort value="recently-added" onChange={onChange} />);
    await user.click(screen.getByTestId("shelf-sort"));
    await user.click(
      screen.getByRole("option", { name: SORT_LABELS["recently-started"] })
    );
    expect(onChange).toHaveBeenCalledWith<[SortValue]>("recently-started");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("lists all seven sort labels in the dropdown", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ShelfSort value="recently-added" onChange={onChange} />);
    await user.click(screen.getByTestId("shelf-sort"));
    for (const label of Object.values(SORT_LABELS)) {
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
    }
  });
});
