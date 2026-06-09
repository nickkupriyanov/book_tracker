import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PageHistorySection,
  todayLocalDate,
} from "@/features/detail-view/PageHistorySection";
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

describe("PageHistorySection (spec 022 §5.2)", () => {
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

  it("renders the Page history section heading", () => {
    render(<PageHistorySection book={sampleBook} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Page history" })
    ).toBeInTheDocument();
  });

  it("shows the empty state when there are no page logs", () => {
    render(<PageHistorySection book={sampleBook} />);
    expect(screen.getByTestId("page-history-empty")).toHaveTextContent(
      /no page logs yet/i
    );
  });

  it("renders the add-entry form with date and pages inputs", () => {
    render(<PageHistorySection book={sampleBook} />);
    expect(screen.getByTestId("page-history-date-input")).toBeInTheDocument();
    expect(screen.getByTestId("page-history-pages-input")).toBeInTheDocument();
    expect(screen.getByTestId("page-history-add-button")).toBeInTheDocument();
  });

  it("disables Add when the date or pages are empty", () => {
    render(<PageHistorySection book={sampleBook} />);
    expect(screen.getByTestId("page-history-add-button")).toBeDisabled();
  });

  it("adding an entry persists a reading log and renders it in the list", async () => {
    const user = userEvent.setup();
    render(<PageHistorySection book={sampleBook} />);
    const dateInput = screen.getByTestId("page-history-date-input");
    const pagesInput = screen.getByTestId("page-history-pages-input");
    fireEvent.change(dateInput, { target: { value: "2026-05-20" } });
    fireEvent.change(pagesInput, { target: { value: "30" } });
    await user.click(screen.getByTestId("page-history-add-button"));

    await waitFor(() => {
      const stored = useBookLibrary.getState().books[0];
      expect(stored?.readingLogs).toHaveLength(1);
      expect(stored?.readingLogs?.[0]).toMatchObject({
        date: "2026-05-20",
        pagesRead: 30,
        currentPageAfter: 30,
      });
    });

    expect(screen.queryByTestId("page-history-empty")).not.toBeInTheDocument();
    expect(screen.getByTestId("page-history-list")).toBeInTheDocument();
    expect(
      screen.getByTestId("page-history-row").getAttribute("data-date")
    ).toBe("2026-05-20");
  });

  it("renders multiple entries newest first", async () => {
    const user = userEvent.setup();
    render(<PageHistorySection book={sampleBook} />);

    const dateInput = screen.getByTestId("page-history-date-input");
    const pagesInput = screen.getByTestId("page-history-pages-input");
    fireEvent.change(dateInput, { target: { value: "2026-05-01" } });
    fireEvent.change(pagesInput, { target: { value: "20" } });
    await user.click(screen.getByTestId("page-history-add-button"));
    await waitFor(() => {
      expect(useBookLibrary.getState().books[0]?.readingLogs).toHaveLength(1);
    });

    fireEvent.change(dateInput, { target: { value: "2026-05-15" } });
    fireEvent.change(pagesInput, { target: { value: "10" } });
    await user.click(screen.getByTestId("page-history-add-button"));
    await waitFor(() => {
      expect(useBookLibrary.getState().books[0]?.readingLogs).toHaveLength(2);
    });

    const rows = screen.getAllByTestId("page-history-row");
    expect(rows[0]!.getAttribute("data-date")).toBe("2026-05-15");
    expect(rows[1]!.getAttribute("data-date")).toBe("2026-05-01");
  });

  it("edits an existing entry's pagesRead and re-syncs later entries", async () => {
    const user = userEvent.setup();
    render(<PageHistorySection book={sampleBook} />);
    const dateInput = screen.getByTestId("page-history-date-input");
    const pagesInput = screen.getByTestId("page-history-pages-input");

    // Seed two logs.
    fireEvent.change(dateInput, { target: { value: "2026-05-01" } });
    fireEvent.change(pagesInput, { target: { value: "20" } });
    await user.click(screen.getByTestId("page-history-add-button"));
    await waitFor(() =>
      expect(useBookLibrary.getState().books[0]?.readingLogs).toHaveLength(1)
    );
    fireEvent.change(dateInput, { target: { value: "2026-05-15" } });
    fireEvent.change(pagesInput, { target: { value: "30" } });
    await user.click(screen.getByTestId("page-history-add-button"));
    await waitFor(() =>
      expect(useBookLibrary.getState().books[0]?.readingLogs).toHaveLength(2)
    );

    // Edit 2026-05-01 from 20 to 50.
    const row01 = screen
      .getAllByTestId("page-history-row")
      .find((r) => r.getAttribute("data-date") === "2026-05-01")!;
    await user.click(
      row01.querySelector(
        '[data-testid="page-history-edit-button"]'
      ) as HTMLElement
    );
    const editInput = screen.getByTestId("page-history-edit-input");
    fireEvent.change(editInput, { target: { value: "50" } });
    await user.click(screen.getByTestId("page-history-save-edit"));

    await waitFor(() => {
      const stored = useBookLibrary.getState().books[0];
      expect(stored?.readingLogs?.[0]).toMatchObject({
        date: "2026-05-01",
        pagesRead: 50,
        currentPageAfter: 50,
      });
      expect(stored?.readingLogs?.[1]).toMatchObject({
        date: "2026-05-15",
        pagesRead: 30,
        currentPageAfter: 80,
      });
    });
  });

  it("removes an entry and persists the rest", async () => {
    const user = userEvent.setup();
    render(<PageHistorySection book={sampleBook} />);
    const dateInput = screen.getByTestId("page-history-date-input");
    const pagesInput = screen.getByTestId("page-history-pages-input");
    fireEvent.change(dateInput, { target: { value: "2026-05-01" } });
    fireEvent.change(pagesInput, { target: { value: "20" } });
    await user.click(screen.getByTestId("page-history-add-button"));
    await waitFor(() =>
      expect(useBookLibrary.getState().books[0]?.readingLogs).toHaveLength(1)
    );
    fireEvent.change(dateInput, { target: { value: "2026-05-15" } });
    fireEvent.change(pagesInput, { target: { value: "30" } });
    await user.click(screen.getByTestId("page-history-add-button"));
    await waitFor(() =>
      expect(useBookLibrary.getState().books[0]?.readingLogs).toHaveLength(2)
    );

    const row15 = screen
      .getAllByTestId("page-history-row")
      .find((r) => r.getAttribute("data-date") === "2026-05-15")!;
    await user.click(
      row15.querySelector(
        '[data-testid="page-history-remove-button"]'
      ) as HTMLElement
    );

    await waitFor(() => {
      const stored = useBookLibrary.getState().books[0];
      expect(stored?.readingLogs).toHaveLength(1);
      expect(stored?.readingLogs?.[0]?.date).toBe("2026-05-01");
    });
  });

  it("removes readingLogs when deleting the only entry", async () => {
    const user = userEvent.setup();
    render(<PageHistorySection book={sampleBook} />);
    fireEvent.change(screen.getByTestId("page-history-date-input"), {
      target: { value: "2026-05-01" },
    });
    fireEvent.change(screen.getByTestId("page-history-pages-input"), {
      target: { value: "20" },
    });
    await user.click(screen.getByTestId("page-history-add-button"));
    await waitFor(() =>
      expect(useBookLibrary.getState().books[0]?.readingLogs).toHaveLength(1)
    );

    await user.click(screen.getByTestId("page-history-remove-button"));

    await waitFor(() => {
      const stored = useBookLibrary.getState().books[0];
      expect(stored?.currentPage).toBeUndefined();
      expect(stored?.readingLogs).toBeUndefined();
    });
  });

  it("rejects non-integer pages read with an inline error", async () => {
    render(<PageHistorySection book={sampleBook} />);
    fireEvent.change(screen.getByTestId("page-history-date-input"), {
      target: { value: "2026-05-20" },
    });
    fireEvent.change(screen.getByTestId("page-history-pages-input"), {
      target: { value: "12.5" },
    });
    fireEvent.submit(
      screen.getByTestId("page-history-date-input").closest("form")!
    );
    await waitFor(() => {
      expect(screen.getByTestId("page-history-error")).toHaveTextContent(
        /whole number/i
      );
    });
    expect(useBookLibrary.getState().books[0]?.readingLogs).toBeUndefined();
  });

  it("marks today as the default when adding the first entry via UI flow", async () => {
    const user = userEvent.setup();
    const today = todayLocalDate();
    render(<PageHistorySection book={sampleBook} />);
    fireEvent.change(screen.getByTestId("page-history-pages-input"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByTestId("page-history-date-input"), {
      target: { value: today },
    });
    await user.click(screen.getByTestId("page-history-add-button"));
    await waitFor(() => {
      const stored = useBookLibrary.getState().books[0];
      expect(stored?.readingLogs?.[0]?.date).toBe(today);
    });
  });
});
