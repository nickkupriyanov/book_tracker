import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageProgressQuickUpdate } from "@/features/page-progress/PageProgressQuickUpdate";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";
import type { Book } from "@/types/book";

function makeReadingBook(overrides: Partial<Book> = {}): Book {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Piranesi",
    author: overrides.author ?? "Susanna Clarke",
    status: "reading",
    tags: [],
    createdAt: overrides.createdAt ?? "2026-06-02T00:00:00.000Z",
    ...(overrides.currentPage !== undefined
      ? { currentPage: overrides.currentPage }
      : {}),
    ...(overrides.totalPages !== undefined
      ? { totalPages: overrides.totalPages }
      : {}),
    ...(overrides.readingLogs !== undefined
      ? { readingLogs: overrides.readingLogs }
      : {}),
  };
}

// Seed by writing the supplied books straight into the
// LocalStorageAdapter — bypassing `addBook` so we can
// control the `id` (the store's `addBook` would override
// `id` and `createdAt` with fresh values, which would
// break the "find the book by id" assertions below).
async function seed(books: Book[]): Promise<void> {
  const adapter = new LocalStorageAdapter();
  const existing = await adapter.listBooks();
  const next = [...existing, ...books];
  localStorage.setItem("book-tracker:books", JSON.stringify(next));
  await useBookLibrary.getState().init(adapter);
}

describe("PageProgressQuickUpdate", () => {
  beforeEach(async () => {
    __resetBookLibrary();
    localStorage.clear();
  });

  it("renders the active book in the focus panel", async () => {
    await seed([makeReadingBook({ id: "a", title: "Alpha" })]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("saves a current page through useBookLibrary.updateBook", async () => {
    const user = userEvent.setup();
    await seed([makeReadingBook({ id: "a", title: "Alpha" })]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);

    const input = screen.getByTestId("page-progress-page-input");
    fireEvent.change(input, { target: { value: "77" } });
    await user.click(screen.getByTestId("page-progress-save"));

    await waitFor(() => {
      const book = useBookLibrary
        .getState()
        .books.find((b) => b.id === "a");
      expect(book?.currentPage).toBe(77);
    });
  });

  it("shows progress text 'N / M pages' when totalPages is set", async () => {
    await seed([
      makeReadingBook({ id: "a", currentPage: 100, totalPages: 420 }),
    ]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);
    expect(screen.getByTestId("page-progress-text")).toHaveTextContent(
      "100 / 420 pages"
    );
  });

  it("shows progress text 'Page N' when only currentPage is set", async () => {
    await seed([makeReadingBook({ id: "a", currentPage: 33 })]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);
    expect(screen.getByTestId("page-progress-text")).toHaveTextContent(
      "Page 33"
    );
  });

  it("does not render the progress bar when totalPages is not set", async () => {
    await seed([makeReadingBook({ id: "a", currentPage: 33 })]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);
    expect(screen.queryByTestId("page-progress-bar")).not.toBeInTheDocument();
  });

  it("renders the progress bar when totalPages is set", async () => {
    await seed([
      makeReadingBook({ id: "a", currentPage: 100, totalPages: 400 }),
    ]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);
    const bar = screen.getByTestId("page-progress-bar");
    expect(bar).toHaveAttribute("aria-valuenow", "25");
  });

  it("shows the add-total-pages prompt when totalPages is not set", async () => {
    await seed([makeReadingBook({ id: "a", currentPage: 33 })]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);
    const prompt = screen.getByTestId("page-progress-add-total");
    expect(prompt).toBeInTheDocument();
    expect(prompt.querySelector("a")).toHaveAttribute("href", "/book/a");
  });

  it("links to the active book detail page from the focus panel", async () => {
    await seed([makeReadingBook({ id: "a", title: "Alpha" })]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);
    expect(screen.getByRole("link", { name: /open book/i })).toHaveAttribute(
      "href",
      "/book/a"
    );
  });

  it("shows the 'Finished' button at any currentPage", async () => {
    await seed([
      makeReadingBook({ id: "a", currentPage: 50, totalPages: 420 }),
    ]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);
    expect(screen.getByTestId("page-progress-finished")).toBeInTheDocument();
  });

  it("'Finished' changes the book's status to 'read' and sets currentPage to totalPages when known", async () => {
    const user = userEvent.setup();
    await seed([
      makeReadingBook({ id: "a", currentPage: 420, totalPages: 420 }),
    ]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);
    await user.click(screen.getByTestId("page-progress-finished"));

    await waitFor(() => {
      const book = useBookLibrary
        .getState()
        .books.find((b) => b.id === "a");
      expect(book?.status).toBe("read");
      expect(book?.currentPage).toBe(420);
      expect(book?.totalPages).toBe(420);
    });
  });

  it("'Finished' sets currentPage to totalPages when totalPages is known but currentPage is behind", async () => {
    const user = userEvent.setup();
    await seed([
      makeReadingBook({ id: "a", currentPage: 200, totalPages: 420 }),
    ]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);
    await user.click(screen.getByTestId("page-progress-finished"));

    await waitFor(() => {
      const book = useBookLibrary
        .getState()
        .books.find((b) => b.id === "a");
      expect(book?.status).toBe("read");
      expect(book?.currentPage).toBe(420);
    });
  });

  it("'Finished' preserves currentPage when totalPages is unknown", async () => {
    const user = userEvent.setup();
    await seed([makeReadingBook({ id: "a", currentPage: 120 })]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);
    await user.click(screen.getByTestId("page-progress-finished"));

    await waitFor(() => {
      const book = useBookLibrary
        .getState()
        .books.find((b) => b.id === "a");
      expect(book?.status).toBe("read");
      expect(book?.currentPage).toBe(120);
      expect(book?.totalPages).toBeUndefined();
    });
  });

  describe("progress widget (spec 019)", () => {
    it("labels the typed-save CTA 'Update progress'", async () => {
      await seed([makeReadingBook({ id: "a" })]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      expect(screen.getByTestId("page-progress-save")).toHaveTextContent(
        "Update progress"
      );
    });

    it("shows 'N% completed' alongside the page fraction", async () => {
      await seed([
        makeReadingBook({ id: "a", currentPage: 100, totalPages: 400 }),
      ]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      expect(screen.getByTestId("page-progress-percent")).toHaveTextContent(
        "25% completed"
      );
    });

    it("exposes a fully accessible progressbar with aria-label, valuemin, valuemax", async () => {
      await seed([
        makeReadingBook({ id: "a", currentPage: 100, totalPages: 400 }),
      ]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      const bar = screen.getByTestId("page-progress-bar");
      expect(bar.tagName.toLowerCase()).toBe("div");
      expect(bar).toHaveAttribute("role", "progressbar");
      expect(bar).toHaveAttribute("aria-label", "Reading progress");
      expect(bar).toHaveAttribute("aria-valuemin", "0");
      expect(bar).toHaveAttribute("aria-valuemax", "100");
      expect(bar).toHaveAttribute("aria-valuenow", "25");
    });

    it("does not show 'N% completed' or bookmark line when totalPages is missing", async () => {
      await seed([makeReadingBook({ id: "a", currentPage: 33 })]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      expect(
        screen.queryByTestId("page-progress-percent")
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("page-progress-bar")).not.toBeInTheDocument();
    });

    it("shows 'N pages left' when both currentPage and totalPages are set", async () => {
      await seed([
        makeReadingBook({ id: "a", currentPage: 100, totalPages: 420 }),
      ]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      expect(
        screen.getByTestId("page-progress-pages-left")
      ).toHaveTextContent("320 pages left");
    });

    it("clamps pages-left at 0 when currentPage exceeds totalPages", async () => {
      // Reaching the end is allowed: the user can record being on the
      // final page without the widget showing negative pages left.
      await seed([
        makeReadingBook({ id: "a", currentPage: 420, totalPages: 420 }),
      ]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      expect(
        screen.getByTestId("page-progress-pages-left")
      ).toHaveTextContent("0 pages left");
    });

    it("does not show 'N pages left' when totalPages is unknown", async () => {
      await seed([makeReadingBook({ id: "a", currentPage: 33 })]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      expect(
        screen.queryByTestId("page-progress-pages-left")
      ).not.toBeInTheDocument();
    });

    it("hides the 'You read N pages today' line when no log exists for today", async () => {
      await seed([
        makeReadingBook({ id: "a", currentPage: 50, totalPages: 200 }),
      ]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      expect(
        screen.queryByTestId("page-progress-today")
      ).not.toBeInTheDocument();
    });

    it("shows 'You read N pages today' when a reading log exists for today", async () => {
      const today = new Date().toISOString().slice(0, 10);
      await seed([
        makeReadingBook({
          id: "a",
          currentPage: 120,
          totalPages: 420,
          readingLogs: [
            {
              id: crypto.randomUUID(),
              date: today,
              pagesRead: 30,
              currentPageAfter: 120,
              createdAt: "2026-06-08T10:00:00.000Z",
              updatedAt: "2026-06-08T10:00:00.000Z",
            },
          ],
        }),
      ]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      expect(screen.getByTestId("page-progress-today")).toHaveTextContent(
        "You read 30 pages today"
      );
    });

    it("'+10 pages' saves currentPage + 10 and adds a positive reading log delta", async () => {
      const user = userEvent.setup();
      await seed([
        makeReadingBook({ id: "a", currentPage: 50, totalPages: 400 }),
      ]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      await user.click(screen.getByTestId("page-progress-quick-10"));

      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.currentPage).toBe(60);
        expect(updated?.readingLogs).toHaveLength(1);
        expect(updated?.readingLogs![0]!.pagesRead).toBe(10);
        expect(updated?.readingLogs![0]!.currentPageAfter).toBe(60);
      });
    });

    it("'+25 pages' saves currentPage + 25 and adds a positive reading log delta", async () => {
      const user = userEvent.setup();
      await seed([
        makeReadingBook({ id: "a", currentPage: 100, totalPages: 400 }),
      ]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      await user.click(screen.getByTestId("page-progress-quick-25"));

      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.currentPage).toBe(125);
        expect(updated?.readingLogs).toHaveLength(1);
        expect(updated?.readingLogs![0]!.pagesRead).toBe(25);
      });
    });

    it("'+10 pages' treats a missing currentPage as 0", async () => {
      const user = userEvent.setup();
      await seed([makeReadingBook({ id: "a", totalPages: 400 })]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      await user.click(screen.getByTestId("page-progress-quick-10"));

      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.currentPage).toBe(10);
        expect(updated?.readingLogs).toHaveLength(1);
        expect(updated?.readingLogs![0]!.pagesRead).toBe(10);
      });
    });

    it("'+25 pages' caps the next currentPage at totalPages when near the end", async () => {
      const user = userEvent.setup();
      await seed([
        makeReadingBook({ id: "a", currentPage: 410, totalPages: 420 }),
      ]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      await user.click(screen.getByTestId("page-progress-quick-25"));

      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        // 410 + 25 = 435, capped at totalPages = 420; delta = 10
        expect(updated?.currentPage).toBe(420);
        expect(updated?.readingLogs).toHaveLength(1);
        expect(updated?.readingLogs![0]!.pagesRead).toBe(10);
      });
    });
  });

  it("rejects currentPage > totalPages with an inline error and does not save", async () => {
    const user = userEvent.setup();
    await seed([
      makeReadingBook({ id: "a", currentPage: 100, totalPages: 200 }),
    ]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);

    const input = screen.getByTestId("page-progress-page-input");
    fireEvent.change(input, { target: { value: "250" } });
    await user.click(screen.getByTestId("page-progress-save"));

    await waitFor(() => {
      expect(
        screen.getByTestId("page-progress-error")
      ).toBeInTheDocument();
    });
    const unchanged = useBookLibrary.getState().books.find((b) => b.id === "a");
    expect(unchanged?.currentPage).toBe(100);
  });

  it("clears currentPage when the page input is empty", async () => {
    const user = userEvent.setup();
    await seed([makeReadingBook({ id: "a", currentPage: 100 })]);
    const book = useBookLibrary.getState().books[0];
    if (book === undefined) throw new Error("missing seeded book");
    render(<PageProgressQuickUpdate book={book} />);

    const input = screen.getByTestId("page-progress-page-input");
    fireEvent.change(input, { target: { value: "" } });
    const saveButton = screen.getByTestId("page-progress-save");
    await user.click(saveButton);

    await waitFor(() => {
      const updated = useBookLibrary.getState().books.find((b) => b.id === "a");
      expect(updated?.currentPage).toBeUndefined();
    });
  });

  describe("reading log creation (spec 016 FR-14–FR-17)", () => {
    it("creates a reading log with pagesRead = newCurrentPage when there was no previous currentPage", async () => {
      const user = userEvent.setup();
      await seed([makeReadingBook({ id: "a" })]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);

      const input = screen.getByTestId("page-progress-page-input");
      fireEvent.change(input, { target: { value: "50" } });
      await user.click(screen.getByTestId("page-progress-save"));

      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.readingLogs).toHaveLength(1);
        expect(updated?.readingLogs![0]!.pagesRead).toBe(50);
        expect(updated?.readingLogs![0]!.currentPageAfter).toBe(50);
        expect(updated?.readingLogs![0]!.date).toBe(
          new Date().toISOString().slice(0, 10)
        );
      });
    });

    it("creates a reading log with positive delta when currentPage increases", async () => {
      const user = userEvent.setup();
      await seed([makeReadingBook({ id: "a", currentPage: 50 })]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);

      const input = screen.getByTestId("page-progress-page-input");
      fireEvent.change(input, { target: { value: "80" } });
      await user.click(screen.getByTestId("page-progress-save"));

      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.readingLogs).toHaveLength(1);
        expect(updated?.readingLogs![0]!.pagesRead).toBe(30);
      });
    });

    it("does not add log pages when currentPage stays the same", async () => {
      const user = userEvent.setup();
      await seed([makeReadingBook({ id: "a", currentPage: 50 })]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);

      const input = screen.getByTestId("page-progress-page-input");
      fireEvent.change(input, { target: { value: "50" } });
      await user.click(screen.getByTestId("page-progress-save"));

      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.currentPage).toBe(50);
        expect(updated?.readingLogs).toBeUndefined();
      });
    });

    it("does not add log pages when currentPage decreases", async () => {
      const user = userEvent.setup();
      await seed([makeReadingBook({ id: "a", currentPage: 100 })]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);

      const input = screen.getByTestId("page-progress-page-input");
      fireEvent.change(input, { target: { value: "70" } });
      await user.click(screen.getByTestId("page-progress-save"));

      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.currentPage).toBe(70);
        expect(updated?.readingLogs).toBeUndefined();
      });
    });

    it("does not create a reading log when currentPage is cleared", async () => {
      const user = userEvent.setup();
      await seed([makeReadingBook({ id: "a", currentPage: 100 })]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);

      const input = screen.getByTestId("page-progress-page-input");
      fireEvent.change(input, { target: { value: "" } });
      await user.click(screen.getByTestId("page-progress-save"));

      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.currentPage).toBeUndefined();
        expect(updated?.readingLogs).toBeUndefined();
      });
    });

    it("aggregates multiple saves on the same day into one log entry", async () => {
      const user = userEvent.setup();
      await seed([makeReadingBook({ id: "a", currentPage: 10 })]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);

      // First save: 10 → 40 (+30)
      const input = screen.getByTestId("page-progress-page-input");
      fireEvent.change(input, { target: { value: "40" } });
      await user.click(screen.getByTestId("page-progress-save"));

      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.readingLogs).toHaveLength(1);
        expect(updated?.readingLogs![0]!.pagesRead).toBe(30);
      });

      // Second save: 40 → 100 (+60, aggregate = 90)
      fireEvent.change(input, { target: { value: "100" } });
      await user.click(screen.getByTestId("page-progress-save"));

      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.readingLogs).toHaveLength(1);
        expect(updated?.readingLogs![0]!.pagesRead).toBe(90);
        expect(updated?.readingLogs![0]!.currentPageAfter).toBe(100);
      });
    });
  });
});
