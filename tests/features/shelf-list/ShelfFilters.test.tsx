import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShelfFilters } from "@/features/shelf-list/ShelfFilters";
import type { ReadingStatus } from "@/types/book";

const defaultCounts: Record<"all" | ReadingStatus, number> = {
  all: 3,
  want: 1,
  reading: 1,
  read: 1,
};

describe("ShelfFilters", () => {
  it("renders 4 triggers with labels and counts", () => {
    render(
      <ShelfFilters
        value="all"
        onChange={vi.fn()}
        counts={defaultCounts}
      />
    );
    expect(
      screen.getByRole("tab", { name: /All \(3\)/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Want to read \(1\)/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Reading \(1\)/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Read \(1\)/ })
    ).toBeInTheDocument();
  });

  it("calls onChange with the trigger's value when clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ShelfFilters
        value="all"
        onChange={onChange}
        counts={defaultCounts}
      />
    );

    await user.click(screen.getByRole("tab", { name: /^Reading/ }));
    expect(onChange).toHaveBeenCalledWith("reading");

    await user.click(screen.getByRole("tab", { name: /Want to read/ }));
    expect(onChange).toHaveBeenCalledWith("want");

    await user.click(screen.getByRole("tab", { name: /^Read \(/ }));
    expect(onChange).toHaveBeenCalledWith("read");
  });

  it("marks the active trigger matching the value prop", () => {
    const { rerender } = render(
      <ShelfFilters
        value="all"
        onChange={vi.fn()}
        counts={defaultCounts}
      />
    );
    expect(
      screen.getByRole("tab", { name: /All \(3\)/ })
    ).toHaveAttribute("data-state", "active");
    expect(
      screen.getByRole("tab", { name: /Reading \(1\)/ })
    ).toHaveAttribute("data-state", "inactive");

    rerender(
      <ShelfFilters
        value="reading"
        onChange={vi.fn()}
        counts={defaultCounts}
      />
    );
    expect(
      screen.getByRole("tab", { name: /Reading \(1\)/ })
    ).toHaveAttribute("data-state", "active");
    expect(
      screen.getByRole("tab", { name: /All \(3\)/ })
    ).toHaveAttribute("data-state", "inactive");
  });

  it("updates displayed counts when counts prop changes", () => {
    const { rerender } = render(
      <ShelfFilters
        value="all"
        onChange={vi.fn()}
        counts={defaultCounts}
      />
    );
    expect(
      screen.getByRole("tab", { name: /All \(3\)/ })
    ).toBeInTheDocument();

    rerender(
      <ShelfFilters
        value="all"
        onChange={vi.fn()}
        counts={{ all: 5, want: 2, reading: 1, read: 2 }}
      />
    );
    expect(
      screen.getByRole("tab", { name: /All \(5\)/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Want to read \(2\)/ })
    ).toBeInTheDocument();
  });
});
