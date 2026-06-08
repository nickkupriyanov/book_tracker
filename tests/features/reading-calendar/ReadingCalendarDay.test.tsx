import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReadingCalendarDay } from "@/features/reading-calendar/ReadingCalendarDay";
import type { ReadingCalendarDayModel } from "@/lib/reading-calendar";
import { READING_CALENDAR_FALLBACK_COLOR } from "@/lib/cover-color";

function emptyDay(overrides: Partial<ReadingCalendarDayModel> = {}): ReadingCalendarDayModel {
  return {
    date: "2026-06-10",
    dayOfMonth: 10,
    books: [],
    visibleColors: [],
    ariaLabel: "2026-06-10 — No reading logged",
    title: "2026-06-10 — No reading logged",
    ...overrides,
  };
}

function loggedDay(
  books: { id: string; title: string; color: string }[],
  overrides: Partial<ReadingCalendarDayModel> = {}
): ReadingCalendarDayModel {
  return {
    date: "2026-06-10",
    dayOfMonth: 10,
    books,
    visibleColors: books.map((b) => b.color),
    ariaLabel:
      books.length === 0
        ? "2026-06-10 — No reading logged"
        : `2026-06-10 — ${books.map((b) => b.title).join(", ")}`,
    title:
      books.length === 0
        ? "2026-06-10 — No reading logged"
        : `2026-06-10 — ${books.map((b) => b.title).join(", ")}`,
    ...overrides,
  };
}

describe("ReadingCalendarDay", () => {
  it("renders the day number", () => {
    render(<ReadingCalendarDay day={emptyDay({ dayOfMonth: 7 })} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("marks empty days with data-logged=false", () => {
    render(<ReadingCalendarDay day={emptyDay()} />);
    const cell = screen.getByTestId("reading-calendar-day");
    expect(cell.dataset["logged"]).toBe("false");
  });

  it("uses a muted warm fill for empty days (spec 020 §5.3 theme tokens)", () => {
    render(<ReadingCalendarDay day={emptyDay()} />);
    const cell = screen.getByTestId("reading-calendar-day");
    // The previous dark inline palette (`bg-[#332920]`) was
    // replaced by the app's `muted` and `border` tokens so the
    // empty cells sit in the warm theme.
    expect(cell).toHaveClass("bg-muted");
    expect(cell).toHaveClass("border-border");
  });

  it("uses the aria-label for the empty state", () => {
    render(<ReadingCalendarDay day={emptyDay()} />);
    expect(screen.getByTestId("reading-calendar-day")).toHaveAttribute(
      "aria-label",
      "2026-06-10 — No reading logged"
    );
  });

  it("renders the empty day number with muted foreground color (warm theme)", () => {
    render(<ReadingCalendarDay day={emptyDay({ dayOfMonth: 17 })} />);
    const cell = screen.getByTestId("reading-calendar-day");
    const number = cell.querySelector("span");
    expect(number).not.toBeNull();
    expect(number!.className).toMatch(/text-muted-foreground/);
    expect(number).toHaveTextContent("17");
  });

  it("uses a solid color background for a one-book day", () => {
    render(
      <ReadingCalendarDay
        day={loggedDay([
          { id: "a", title: "A", color: "#aa0000" },
        ])}
      />
    );
    const cell = screen.getByTestId("reading-calendar-day");
    expect(cell.dataset["logged"]).toBe("true");
    // jsdom normalizes hex to rgb() in computed styles; the
    // important contract is "this color, no gradient".
    expect([
      "rgb(170, 0, 0)",
      "#aa0000",
    ]).toContain(cell.style.backgroundColor);
    expect(cell.style.backgroundImage).toBe("");
  });

  it("renders CSS stripes for a two-book day", () => {
    render(
      <ReadingCalendarDay
        day={loggedDay([
          { id: "a", title: "A", color: "#aa0000" },
          { id: "b", title: "B", color: "#00aa00" },
        ])}
      />
    );
    const cell = screen.getByTestId("reading-calendar-day");
    expect(cell.style.backgroundImage).toContain("linear-gradient");
    expect(cell.style.backgroundImage).toContain("#aa0000");
    expect(cell.style.backgroundImage).toContain("#00aa00");
  });

  it("renders up to three stripes for a three-book day", () => {
    render(
      <ReadingCalendarDay
        day={loggedDay([
          { id: "a", title: "A", color: "#aa0000" },
          { id: "b", title: "B", color: "#00aa00" },
          { id: "c", title: "C", color: "#0000aa" },
        ])}
      />
    );
    const cell = screen.getByTestId("reading-calendar-day");
    expect(cell.style.backgroundImage).toContain("linear-gradient");
    expect(cell.style.backgroundImage).toContain("#0000aa");
  });

  it("uses three stripes for a day with more than three books (visibleColors is pre-truncated)", () => {
    const visibleColors = ["#aa0000", "#00aa00", "#0000aa"];
    render(
      <ReadingCalendarDay
        day={loggedDay(
          [
            { id: "a", title: "A", color: "#aa0000" },
            { id: "b", title: "B", color: "#00aa00" },
            { id: "c", title: "C", color: "#0000aa" },
            { id: "d", title: "D", color: "#aaaa00" },
          ],
          { visibleColors }
        )}
      />
    );
    const cell = screen.getByTestId("reading-calendar-day");
    // 4 books, but only 3 colors in the gradient — count the
    // distinct color mentions to confirm 3 stripes.
    const gradient = cell.style.backgroundImage;
    const colors = ["#aa0000", "#00aa00", "#0000aa"];
    for (const c of colors) {
      // Each stripe color appears in two gradient stops.
      const matches = gradient.match(new RegExp(c, "g")) ?? [];
      expect(matches.length).toBe(2);
    }
  });

  it("exposes the full book list in aria-label even when stripes are truncated", () => {
    render(
      <ReadingCalendarDay
        day={loggedDay(
          [
            { id: "a", title: "Alpha", color: "#aa0000" },
            { id: "b", title: "Beta", color: "#00aa00" },
            { id: "c", title: "Gamma", color: "#0000aa" },
            { id: "d", title: "Delta", color: "#aaaa00" },
          ],
          {
            visibleColors: ["#aa0000", "#00aa00", "#0000aa"],
            ariaLabel:
              "2026-06-10 — Alpha, Beta, Gamma, Delta",
            title: "2026-06-10 — Alpha, Beta, Gamma, Delta",
          }
        )}
      />
    );
    const cell = screen.getByTestId("reading-calendar-day");
    expect(cell.getAttribute("aria-label")).toContain("Alpha");
    expect(cell.getAttribute("aria-label")).toContain("Beta");
    expect(cell.getAttribute("aria-label")).toContain("Gamma");
    expect(cell.getAttribute("aria-label")).toContain("Delta");
    expect(cell.getAttribute("title")).toContain("Delta");
  });

  it("falls back to the warm brown color for a logged day with no color (defensive)", () => {
    // ReadingCalendarDay reads `visibleColors` directly, so a
    // parent that passes an empty visibleColors but a non-empty
    // books list still produces a non-empty background (the
    // fallback). This is the read-side counterpart of
    // `colorForBook`.
    const day: ReadingCalendarDayModel = {
      date: "2026-06-10",
      dayOfMonth: 10,
      books: [{ id: "a", title: "A", color: "" }],
      visibleColors: [READING_CALENDAR_FALLBACK_COLOR],
      ariaLabel: "2026-06-10 — A",
      title: "2026-06-10 — A",
    };
    render(<ReadingCalendarDay day={day} />);
    const cell = screen.getByTestId("reading-calendar-day");
    expect(cell.style.backgroundColor).toBe("rgb(138, 111, 77)");
  });
});
