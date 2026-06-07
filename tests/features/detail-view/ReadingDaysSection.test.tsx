import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import {
  ReadingDaysSection,
  todayLocalDate,
} from "@/features/detail-view/ReadingDaysSection";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";
import type { Book } from "@/types/book";

const { mockSuccess, mockError } = vi.hoisted(() => ({
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockSuccess,
    error: mockError,
  },
}));

let sampleBook: Book;

describe("ReadingDaysSection (spec 013)", () => {
  beforeEach(async () => {
    __resetBookLibrary();
    localStorage.clear();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    sampleBook = await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: ["fiction"],
    });
    mockSuccess.mockClear();
    mockError.mockClear();
  });

  it("renders the Reading days section heading", () => {
    render(<ReadingDaysSection book={sampleBook} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Reading days" })
    ).toBeInTheDocument();
  });

  it("shows the empty state when there are no reading days", () => {
    render(<ReadingDaysSection book={sampleBook} />);
    expect(screen.getByTestId("reading-days-empty")).toHaveTextContent(
      /no reading days logged yet/i
    );
  });

  it("renders the Mark today and Add affordances", () => {
    render(<ReadingDaysSection book={sampleBook} />);
    expect(screen.getByTestId("mark-today-button")).toBeInTheDocument();
    expect(screen.getByTestId("reading-day-date-input")).toBeInTheDocument();
    expect(screen.getByTestId("add-reading-day-button")).toBeInTheDocument();
  });

  it("disables Add when the date input is empty", () => {
    render(<ReadingDaysSection book={sampleBook} />);
    expect(screen.getByTestId("add-reading-day-button")).toBeDisabled();
  });

  it("Mark today persists today's local date", async () => {
    const expected = todayLocalDate();
    const user = userEvent.setup();
    render(<ReadingDaysSection book={sampleBook} />);
    await user.click(screen.getByTestId("mark-today-button"));
    await waitFor(() => {
      const stored = useBookLibrary.getState().books[0];
      expect(stored?.readingDays).toEqual([expected]);
    });
  });

  it("Mark today button is disabled and shows 'Today logged' when today is already logged", () => {
    const today = todayLocalDate();
    const bookWithToday: Book = {
      ...sampleBook,
      readingDays: [today],
    };
    render(<ReadingDaysSection book={bookWithToday} />);
    const btn = screen.getByTestId("mark-today-button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(/today logged/i);
  });

  it("marking today twice only persists one entry", async () => {
    const expected = todayLocalDate();
    const user = userEvent.setup();
    render(<ReadingDaysSection book={sampleBook} />);
    await user.click(screen.getByTestId("mark-today-button"));
    await waitFor(() => {
      expect(
        useBookLibrary.getState().books[0]?.readingDays
      ).toEqual([expected]);
    });
    // The button is now disabled — clicking it is a no-op. We
    // confirm the persisted list is still a single entry.
    await user.click(screen.getByTestId("mark-today-button"));
    expect(
      useBookLibrary.getState().books[0]?.readingDays
    ).toEqual([expected]);
  });

  it("adding a selected date persists it", async () => {
    const user = userEvent.setup();
    render(<ReadingDaysSection book={sampleBook} />);
    fireEvent.change(screen.getByTestId("reading-day-date-input"), {
      target: { value: "2026-05-20" },
    });
    await user.click(screen.getByTestId("add-reading-day-button"));
    await waitFor(() => {
      const stored = useBookLibrary.getState().books[0];
      expect(stored?.readingDays).toEqual(["2026-05-20"]);
    });
  });

  it("clears the date input after a successful add", async () => {
    const user = userEvent.setup();
    render(<ReadingDaysSection book={sampleBook} />);
    const input = screen.getByTestId(
      "reading-day-date-input"
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2026-05-20" } });
    await user.click(screen.getByTestId("add-reading-day-button"));
    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("disables Add when the selected date is already logged", () => {
    const book: Book = {
      ...sampleBook,
      readingDays: ["2026-05-20"],
    };
    render(<ReadingDaysSection book={book} />);
    fireEvent.change(screen.getByTestId("reading-day-date-input"), {
      target: { value: "2026-05-20" },
    });
    expect(screen.getByTestId("add-reading-day-button")).toBeDisabled();
  });

  it("renders logged dates newest first", () => {
    const book: Book = {
      ...sampleBook,
      readingDays: ["2026-05-01", "2026-05-15", "2026-04-30"],
    };
    render(<ReadingDaysSection book={book} />);
    const rows = screen.getAllByTestId("reading-day-row");
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("2026-05-15"),
      expect.stringContaining("2026-05-01"),
      expect.stringContaining("2026-04-30"),
    ]);
  });

  it("removes a date and persists the remaining sorted unique list", async () => {
    const book: Book = {
      ...sampleBook,
      readingDays: ["2026-05-01", "2026-05-15", "2026-05-20"],
    };
    const user = userEvent.setup();
    render(<ReadingDaysSection book={book} />);
    const rowFor = (date: string): HTMLElement => {
      const rows = screen.getAllByTestId("reading-day-row");
      const match = rows.find((r) => r.textContent?.includes(date));
      if (!match) throw new Error(`No row for ${date}`);
      return match;
    };
    await user.click(
      rowFor("2026-05-15").querySelector(
        "button"
      ) as HTMLButtonElement
    );
    await waitFor(() => {
      const stored = useBookLibrary.getState().books[0];
      expect(stored?.readingDays).toEqual(["2026-05-01", "2026-05-20"]);
    });
  });

  it("removing the last date persists readingDays: undefined", async () => {
    const today = todayLocalDate();
    const book: Book = {
      ...sampleBook,
      readingDays: [today],
    };
    const user = userEvent.setup();
    render(<ReadingDaysSection book={book} />);
    const row = screen
      .getAllByTestId("reading-day-row")
      .find((r) => r.textContent?.includes(today));
    if (!row) throw new Error("Row not found");
    await user.click(row.querySelector("button") as HTMLButtonElement);
    await waitFor(() => {
      const stored = useBookLibrary.getState().books[0];
      expect(stored?.readingDays).toBeUndefined();
    });
  });

  it("toasts and stays usable when the store throws", async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    const user = userEvent.setup();
    try {
      render(<ReadingDaysSection book={sampleBook} />);
      await user.click(screen.getByTestId("mark-today-button"));
      await waitFor(() => {
        expect(mockError).toHaveBeenCalledWith(
          expect.stringMatching(/couldn't save reading day/i)
        );
      });
      // Section is still on screen and interactive.
      expect(
        screen.getByTestId("mark-today-button")
      ).toBeInTheDocument();
    } finally {
      setItemSpy.mockRestore();
    }
  });
});
