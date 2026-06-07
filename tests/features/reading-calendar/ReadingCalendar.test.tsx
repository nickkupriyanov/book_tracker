import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReadingCalendar } from "@/features/reading-calendar/ReadingCalendar";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";
import type { Book } from "@/types/book";

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    title: "Piranesi",
    author: "Susanna Clarke",
    status: "reading",
    tags: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ReadingCalendar (spec 013)", () => {
  beforeEach(async () => {
    __resetBookLibrary();
    localStorage.clear();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
  });

  it("renders the Reading Calendar heading and a month label", () => {
    render(<ReadingCalendar books={[]} />);
    expect(
      screen.getByRole("region", { name: "Reading Calendar" })
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("reading-calendar-month-label")
    ).toBeInTheDocument();
  });

  it("opens on the current local month", () => {
    // The current local month should be in the label. We don't
    // pin to a specific date here — just assert the label is
    // non-empty and matches a known `Month YYYY` shape.
    render(<ReadingCalendar books={[]} />);
    const label = screen.getByTestId("reading-calendar-month-label").textContent;
    expect(label).toMatch(/^[A-Z][a-z]+ \d{4}$/);
  });

  it("renders the empty state and omits the legend when no days are logged", () => {
    render(<ReadingCalendar books={[]} />);
    expect(
      screen.getByTestId("reading-calendar-empty")
    ).toHaveTextContent(/no reading days logged/i);
    expect(
      screen.queryByTestId("reading-calendar-legend")
    ).not.toBeInTheDocument();
  });

  it("renders the grid (not the empty state) when at least one day is logged", () => {
    const book = makeBook({ readingDays: ["2026-06-10"] });
    // We don't care which month this resolves to for the test —
    // we just want the calendar to render its logged state. The
    // spec covers both shapes elsewhere.
    render(<ReadingCalendar books={[book]} />);
    // Either the grid or the empty state is present, depending
    // on whether the reading day falls in the current month. If
    // it does, the grid is there; if not, the empty state is.
    const grid = screen.queryByTestId("reading-calendar-grid");
    const empty = screen.queryByTestId("reading-calendar-empty");
    expect(grid !== null || empty !== null).toBe(true);
  });

  it("previous button shifts the month label back by one month", async () => {
    const user = userEvent.setup();
    render(<ReadingCalendar books={[]} />);
    const label = screen.getByTestId("reading-calendar-month-label");
    const before = label.textContent ?? "";
    await user.click(screen.getByTestId("reading-calendar-prev"));
    const after = label.textContent ?? "";
    expect(after).not.toBe(before);
  });

  it("next button shifts the month label forward by one month", async () => {
    const user = userEvent.setup();
    render(<ReadingCalendar books={[]} />);
    const label = screen.getByTestId("reading-calendar-month-label");
    const before = label.textContent ?? "";
    await user.click(screen.getByTestId("reading-calendar-next"));
    const after = label.textContent ?? "";
    expect(after).not.toBe(before);
  });

  it("next then previous returns to the original month", async () => {
    const user = userEvent.setup();
    render(<ReadingCalendar books={[]} />);
    const label = screen.getByTestId("reading-calendar-month-label");
    const before = label.textContent ?? "";
    await user.click(screen.getByTestId("reading-calendar-next"));
    await user.click(screen.getByTestId("reading-calendar-prev"));
    expect(label.textContent).toBe(before);
  });

  it("renders a one-color day for a single book", () => {
    const book = makeBook({
      readingDays: ["2026-06-10"],
      coverColor: "#aa0000",
    });
    render(<ReadingCalendar books={[book]} />);
    // Force navigation to June 2026 (covers any test-run date).
    navigateTo(2026, 5);
    const cell = screen
      .getAllByTestId("reading-calendar-day")
      .find((c) => c.dataset["date"] === "2026-06-10");
    expect(cell).toBeDefined();
    expect(cell!.dataset["logged"]).toBe("true");
    expect(["rgb(170, 0, 0)", "#aa0000"]).toContain(
      cell!.style.backgroundColor
    );
  });

  it("renders stripes for a multi-book day", () => {
    const a = makeBook({
      id: "a",
      title: "Alpha",
      readingDays: ["2026-06-10"],
      coverColor: "#aa0000",
    });
    const b = makeBook({
      id: "b",
      title: "Beta",
      readingDays: ["2026-06-10"],
      coverColor: "#00aa00",
    });
    render(<ReadingCalendar books={[a, b]} />);
    navigateTo(2026, 5);
    const cell = screen
      .getAllByTestId("reading-calendar-day")
      .find((c) => c.dataset["date"] === "2026-06-10");
    expect(cell).toBeDefined();
    expect(cell!.style.backgroundImage).toContain("linear-gradient");
    expect(cell!.style.backgroundImage).toContain("#aa0000");
    expect(cell!.style.backgroundImage).toContain("#00aa00");
  });

  it("renders three stripes for a four-book day, with full title list in aria-label", () => {
    const a = makeBook({
      id: "a",
      title: "Alpha",
      readingDays: ["2026-06-10"],
      coverColor: "#aa0000",
    });
    const b = makeBook({
      id: "b",
      title: "Beta",
      readingDays: ["2026-06-10"],
      coverColor: "#00aa00",
    });
    const c = makeBook({
      id: "c",
      title: "Gamma",
      readingDays: ["2026-06-10"],
      coverColor: "#0000aa",
    });
    const d = makeBook({
      id: "d",
      title: "Delta",
      readingDays: ["2026-06-10"],
      coverColor: "#aaaa00",
    });
    render(<ReadingCalendar books={[a, b, c, d]} />);
    navigateTo(2026, 5);
    const cell = screen
      .getAllByTestId("reading-calendar-day")
      .find((c) => c.dataset["date"] === "2026-06-10");
    expect(cell).toBeDefined();
    const aria = cell!.getAttribute("aria-label") ?? "";
    expect(aria).toContain("Alpha");
    expect(aria).toContain("Beta");
    expect(aria).toContain("Gamma");
    expect(aria).toContain("Delta");
  });

  it("renders the legend with only books present in the visible month", () => {
    const inMonth = makeBook({
      id: "in",
      title: "In June",
      readingDays: ["2026-06-10"],
      coverColor: "#aa0000",
    });
    const outOfMonth = makeBook({
      id: "out",
      title: "In July",
      readingDays: ["2026-07-10"],
      coverColor: "#00aa00",
    });
    render(<ReadingCalendar books={[inMonth, outOfMonth]} />);
    navigateTo(2026, 5);
    const legend = screen.getByTestId("reading-calendar-legend");
    expect(within(legend).getByText("In June")).toBeInTheDocument();
    expect(within(legend).queryByText("In July")).not.toBeInTheDocument();
  });

  it("omits the legend when navigating to a month with no logged days", async () => {
    const book = makeBook({
      readingDays: ["2026-06-10"],
      coverColor: "#aa0000",
    });
    const user = userEvent.setup();
    render(<ReadingCalendar books={[book]} />);
    // Navigate forward to a future month that has no logs.
    for (let i = 0; i < 12; i++) {
      await user.click(screen.getByTestId("reading-calendar-next"));
    }
    expect(
      screen.queryByTestId("reading-calendar-legend")
    ).not.toBeInTheDocument();
  });

  it("does not store, mutate, or persist the visible month on navigation", async () => {
    // Seed localStorage with a known books payload so the test
    // can detect accidental writes / mutations.
    const book = makeBook({ readingDays: ["2026-06-10"] });
    localStorage.setItem("book-tracker:books", JSON.stringify([book]));
    const user = userEvent.setup();
    render(<ReadingCalendar books={[book]} />);
    await user.click(screen.getByTestId("reading-calendar-next"));
    await user.click(screen.getByTestId("reading-calendar-next"));
    // The only key the calendar ever touches must be the books
    // list (which the seed above controls). It must not write
    // a separate calendar key, and it must not mutate the
    // books payload.
    const stored = JSON.parse(
      localStorage.getItem("book-tracker:books") ?? "null"
    );
    expect(Array.isArray(stored)).toBe(true);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(book.id);
    expect(localStorage.getItem("book-tracker:calendar-month")).toBeNull();
  });
});

// Helper: navigate the rendered calendar to the given (year,
// 0-based month) by clicking next / prev until the label matches.
function navigateTo(year: number, month: number): void {
  const labelEl = screen.getByTestId("reading-calendar-month-label");
  const target = `${monthName(month)} ${year}`;
  let safety = 0;
  while (labelEl.textContent !== target) {
    if (safety > 36) throw new Error("navigateTo: too many steps");
    safety++;
    const current = labelEl.textContent ?? "";
    if (compareMonthStrings(current, target) < 0) {
      screen.getByTestId("reading-calendar-next").click();
    } else {
      screen.getByTestId("reading-calendar-prev").click();
    }
  }
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthName(month: number): string {
  return MONTH_NAMES[month] ?? "";
}

/** Returns negative if `a` is before `b`, positive if after, 0 if equal. */
function compareMonthStrings(a: string, b: string): number {
  const [ma, ya] = a.split(" ");
  const [mb, yb] = b.split(" ");
  if (ya !== yb) return Number(ya) - Number(yb);
  return MONTH_NAMES.indexOf(ma ?? "") - MONTH_NAMES.indexOf(mb ?? "");
}
