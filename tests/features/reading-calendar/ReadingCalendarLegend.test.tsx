import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReadingCalendarLegend } from "@/features/reading-calendar/ReadingCalendarLegend";
import type { ReadingCalendarLegendEntry } from "@/lib/reading-calendar";

function entries(
  list: { bookId: string; title: string; color: string }[]
): ReadingCalendarLegendEntry[] {
  return list;
}

describe("ReadingCalendarLegend", () => {
  it("renders nothing when entries is empty", () => {
    const { container } = render(<ReadingCalendarLegend entries={[]} />);
    expect(container.firstChild).toBeNull();
    expect(
      screen.queryByTestId("reading-calendar-legend")
    ).not.toBeInTheDocument();
  });

  it("renders one swatch and one title per entry", () => {
    render(
      <ReadingCalendarLegend
        entries={entries([
          { bookId: "a", title: "Piranesi", color: "#aa0000" },
          { bookId: "b", title: "Dune", color: "#0000aa" },
        ])}
      />
    );
    const items = screen.getAllByTestId("reading-calendar-legend-item");
    expect(items).toHaveLength(2);
    expect(screen.getByText("Piranesi")).toBeInTheDocument();
    expect(screen.getByText("Dune")).toBeInTheDocument();
  });

  it("applies the entry color to its swatch", () => {
    render(
      <ReadingCalendarLegend
        entries={entries([
          { bookId: "a", title: "Piranesi", color: "#aa0000" },
        ])}
      />
    );
    const swatch = screen.getByTestId("reading-calendar-legend-swatch");
    expect(swatch.style.backgroundColor).toBe("rgb(170, 0, 0)");
  });

  it("uses list / listitem roles for assistive tech", () => {
    render(
      <ReadingCalendarLegend
        entries={entries([
          { bookId: "a", title: "Piranesi", color: "#aa0000" },
        ])}
      />
    );
    expect(
      screen.getByRole("list", { name: /books in this month/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem")
    ).toBeInTheDocument();
  });
});
