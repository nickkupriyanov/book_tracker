import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageProgressQuickUpdate } from "@/features/page-progress/PageProgressQuickUpdate";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";
import type { Book } from "@/types/book";

function todayLocalDate(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function makeReadingBook(overrides: Partial<Book> = {}): Book {
  const today = todayLocalDate();
  const inferredLogs =
    overrides.readingLogs === undefined && overrides.currentPage !== undefined
      ? [
          {
            id: `${overrides.id ?? "book"}-initial-log`,
            date: today,
            pagesRead: overrides.currentPage,
            currentPageAfter: overrides.currentPage,
            createdAt: `${today}T10:00:00.000Z`,
            updatedAt: `${today}T10:00:00.000Z`,
          },
        ]
      : undefined;
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
      : inferredLogs !== undefined
        ? { readingLogs: inferredLogs }
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

  it("derives progress from logs instead of stale currentPage", async () => {
    await seed([
      makeReadingBook({
        id: "a",
        currentPage: 999,
        totalPages: 420,
        readingLogs: [
          {
            id: "log",
            date: "2026-06-01",
            pagesRead: 100,
            currentPageAfter: 100,
            createdAt: "2026-06-01T10:00:00.000Z",
            updatedAt: "2026-06-01T10:00:00.000Z",
          },
        ],
      }),
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
    // When total pages are reached, the dedicated "Mark as read"
    // action replaces the generic Finished button.
    await user.click(screen.getByTestId("page-progress-mark-read"));

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
        makeReadingBook({
          id: "a",
          currentPage: 50,
          totalPages: 200,
          readingLogs: [
            {
              id: "past",
              date: "2026-06-01",
              pagesRead: 50,
              currentPageAfter: 50,
              createdAt: "2026-06-01T10:00:00.000Z",
              updatedAt: "2026-06-01T10:00:00.000Z",
            },
          ],
        }),
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

    it("'+10 pages' saves the new currentPage and a positive pagesRead", async () => {
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
        // Spec 022: target = absolute; same-day aggregate is updated.
        expect(updated?.readingLogs![0]!.pagesRead).toBe(60);
        expect(updated?.readingLogs![0]!.currentPageAfter).toBe(60);
      });
    });

    it("'+25 pages' saves the new currentPage and a positive pagesRead", async () => {
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
        expect(updated?.readingLogs![0]!.pagesRead).toBe(125);
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
        // 410 + 25 = 435, capped at totalPages = 420.
        expect(updated?.currentPage).toBe(420);
        expect(updated?.readingLogs).toHaveLength(1);
        expect(updated?.readingLogs![0]!.pagesRead).toBe(420);
        expect(updated?.readingLogs![0]!.currentPageAfter).toBe(420);
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

  describe("reading log creation (spec 016 FR-14–FR-17 / spec 022 §3)", () => {
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

    it("sets pagesRead to the new target minus pages already logged before today", async () => {
      // Earlier date has 30 pages logged. Target 80 today = 80 - 30 = 50
      // pages on today's log entry, currentPageAfter 80.
      const user = userEvent.setup();
      await seed([
        makeReadingBook({
          id: "a",
          currentPage: 30,
          readingLogs: [
            {
              id: "old",
              date: "2026-06-01",
              pagesRead: 30,
              currentPageAfter: 30,
              createdAt: "2026-06-01T10:00:00.000Z",
              updatedAt: "2026-06-01T10:00:00.000Z",
            },
          ],
        }),
      ]);
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
        expect(updated?.currentPage).toBe(80);
        const todayLog = updated?.readingLogs?.find(
          (l) => l.date === new Date().toISOString().slice(0, 10)
        );
        expect(todayLog?.pagesRead).toBe(50);
        expect(todayLog?.currentPageAfter).toBe(80);
      });
    });

    it("replaces today's pagesRead when the target is corrected lower (e.g. 30 -> 10 -> 30 totals 30 pages)", async () => {
      // Start at 0, target 30, then correct to 10 (aggregate should
      // become 10, NOT 30+10=40), then return to 30 (aggregate 30).
      const user = userEvent.setup();
      await seed([makeReadingBook({ id: "a" })]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);
      const input = screen.getByTestId("page-progress-page-input");

      fireEvent.change(input, { target: { value: "30" } });
      await user.click(screen.getByTestId("page-progress-save"));
      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.currentPage).toBe(30);
      });

      fireEvent.change(input, { target: { value: "10" } });
      await user.click(screen.getByTestId("page-progress-save"));
      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.currentPage).toBe(10);
        const todayLog = updated?.readingLogs?.find(
          (l) => l.date === new Date().toISOString().slice(0, 10)
        );
        expect(todayLog?.pagesRead).toBe(10);
      });

      fireEvent.change(input, { target: { value: "30" } });
      await user.click(screen.getByTestId("page-progress-save"));
      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.currentPage).toBe(30);
        const todayLog = updated?.readingLogs?.find(
          (l) => l.date === new Date().toISOString().slice(0, 10)
        );
        expect(todayLog?.pagesRead).toBe(30);
      });
    });

    it("removes today's log when the target is below pages already logged before today", async () => {
      // 30 logged on 2026-06-01. Typing 10 today is below 30 → blocked.
      const user = userEvent.setup();
      await seed([
        makeReadingBook({
          id: "a",
          currentPage: 30,
          readingLogs: [
            {
              id: "old",
              date: "2026-06-01",
              pagesRead: 30,
              currentPageAfter: 30,
              createdAt: "2026-06-01T10:00:00.000Z",
              updatedAt: "2026-06-01T10:00:00.000Z",
            },
          ],
        }),
      ]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);

      const input = screen.getByTestId("page-progress-page-input");
      fireEvent.change(input, { target: { value: "10" } });
      await user.click(screen.getByTestId("page-progress-save"));

      await waitFor(() => {
        expect(screen.getByTestId("page-progress-error")).toBeInTheDocument();
      });
    });

    it("removes today's log when the target equals pages already logged before today", async () => {
      const user = userEvent.setup();
      await seed([
        makeReadingBook({
          id: "a",
          currentPage: 30,
          readingLogs: [
            {
              id: "old",
              date: "2026-06-01",
              pagesRead: 30,
              currentPageAfter: 30,
              createdAt: "2026-06-01T10:00:00.000Z",
              updatedAt: "2026-06-01T10:00:00.000Z",
            },
          ],
        }),
      ]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);

      const input = screen.getByTestId("page-progress-page-input");
      fireEvent.change(input, { target: { value: "30" } });
      await user.click(screen.getByTestId("page-progress-save"));

      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.currentPage).toBe(30);
        const todayLog = updated?.readingLogs?.find(
          (l) => l.date === new Date().toISOString().slice(0, 10)
        );
        expect(todayLog).toBeUndefined();
      });
    });

    it("clears currentPage and today's log when the input is emptied", async () => {
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

    it("removes readingLogs when clearing the only log", async () => {
      const user = userEvent.setup();
      const today = new Date().toISOString().slice(0, 10);
      await seed([
        makeReadingBook({
          id: "a",
          currentPage: 100,
          readingLogs: [
            {
              id: "today",
              date: today,
              pagesRead: 100,
              currentPageAfter: 100,
              createdAt: `${today}T10:00:00.000Z`,
              updatedAt: `${today}T10:00:00.000Z`,
            },
          ],
        }),
      ]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);

      fireEvent.change(screen.getByTestId("page-progress-page-input"), {
        target: { value: "" },
      });
      await user.click(screen.getByTestId("page-progress-save"));

      await waitFor(() => {
        const updated = useBookLibrary
          .getState()
          .books.find((b) => b.id === "a");
        expect(updated?.currentPage).toBeUndefined();
        expect(updated?.readingLogs).toBeUndefined();
      });
    });

    it("shows the completion prompt when target reaches total pages (FR-11)", async () => {
      const user = userEvent.setup();
      await seed([
        makeReadingBook({ id: "a", currentPage: 100, totalPages: 200 }),
      ]);
      const book = useBookLibrary.getState().books[0];
      if (book === undefined) throw new Error("missing seeded book");
      render(<PageProgressQuickUpdate book={book} />);

      const input = screen.getByTestId("page-progress-page-input");
      fireEvent.change(input, { target: { value: "200" } });
      await user.click(screen.getByTestId("page-progress-save"));

      await waitFor(() => {
        expect(
          screen.getByTestId("page-progress-completion")
        ).toBeInTheDocument();
      });
      expect(
        screen.getByTestId("page-progress-mark-read")
      ).toBeInTheDocument();
    });
  });
});
