import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClearFilters } from "@/features/shelf-list/ClearFilters";

describe("ClearFilters", () => {
  it("renders the button with the text 'Clear filters' and data-testid", () => {
    render(<ClearFilters onClick={() => {}} />);
    const button = screen.getByTestId("shelf-clear-filters");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Clear filters");
  });

  it("calls onClick exactly once when the button is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ClearFilters onClick={onClick} />);
    await user.click(screen.getByTestId("shelf-clear-filters"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("has an accessible name containing 'Clear filters' (icon is aria-hidden)", () => {
    render(<ClearFilters onClick={() => {}} />);
    const button = screen.getByTestId("shelf-clear-filters");
    expect(button).toHaveAccessibleName("Clear filters");
  });
});
