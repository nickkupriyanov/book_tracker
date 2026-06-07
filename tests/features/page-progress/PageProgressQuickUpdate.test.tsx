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

  it("renders the reading book list inside the Select trigger", async () => {
    await seed([makeReadingBook({ id: "a", title: "Alpha" })]);
    render(<PageProgressQuickUpdate books={useBookLibrary.getState().books} />);
    expect(
      screen.getByTestId("page-progress-book-trigger")
    ).toHaveTextContent("Alpha");
  });

  it("saves a current page through useBookLibrary.updateBook", async () => {
    const user = userEvent.setup();
    await seed([makeReadingBook({ id: "a", title: "Alpha" })]);
    render(<PageProgressQuickUpdate books={useBookLibrary.getState().books} />);

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
    render(<PageProgressQuickUpdate books={useBookLibrary.getState().books} />);
    expect(screen.getByTestId("page-progress-text")).toHaveTextContent(
      "100 / 420 pages"
    );
  });

  it("shows progress text 'Page N' when only currentPage is set", async () => {
    await seed([makeReadingBook({ id: "a", currentPage: 33 })]);
    render(<PageProgressQuickUpdate books={useBookLibrary.getState().books} />);
    expect(screen.getByTestId("page-progress-text")).toHaveTextContent(
      "Page 33"
    );
  });

  it("does not render the progress bar when totalPages is not set", async () => {
    await seed([makeReadingBook({ id: "a", currentPage: 33 })]);
    render(<PageProgressQuickUpdate books={useBookLibrary.getState().books} />);
    expect(screen.queryByTestId("page-progress-bar")).not.toBeInTheDocument();
  });

  it("renders the progress bar when totalPages is set", async () => {
    await seed([
      makeReadingBook({ id: "a", currentPage: 100, totalPages: 400 }),
    ]);
    render(<PageProgressQuickUpdate books={useBookLibrary.getState().books} />);
    const bar = screen.getByTestId("page-progress-bar");
    expect(bar).toHaveAttribute("aria-valuenow", "25");
  });

  it("shows the add-total-pages prompt when totalPages is not set", async () => {
    await seed([makeReadingBook({ id: "a", currentPage: 33 })]);
    render(<PageProgressQuickUpdate books={useBookLibrary.getState().books} />);
    const prompt = screen.getByTestId("page-progress-add-total");
    expect(prompt).toBeInTheDocument();
    expect(prompt.querySelector("a")).toHaveAttribute("href", "/book/a");
  });

  it("does not show the 'Mark as read' button unless currentPage === totalPages", async () => {
    await seed([
      makeReadingBook({ id: "a", currentPage: 50, totalPages: 420 }),
    ]);
    render(<PageProgressQuickUpdate books={useBookLibrary.getState().books} />);
    expect(
      screen.queryByTestId("page-progress-mark-as-read")
    ).not.toBeInTheDocument();
  });

  it("shows 'Mark as read' when currentPage === totalPages", async () => {
    await seed([
      makeReadingBook({ id: "a", currentPage: 420, totalPages: 420 }),
    ]);
    render(<PageProgressQuickUpdate books={useBookLibrary.getState().books} />);
    expect(
      screen.getByTestId("page-progress-mark-as-read")
    ).toBeInTheDocument();
  });

  it("'Mark as read' changes the book's status to 'read' and preserves page fields", async () => {
    const user = userEvent.setup();
    await seed([
      makeReadingBook({ id: "a", currentPage: 420, totalPages: 420 }),
    ]);
    render(<PageProgressQuickUpdate books={useBookLibrary.getState().books} />);
    await user.click(screen.getByTestId("page-progress-mark-as-read"));

    await waitFor(() => {
      const book = useBookLibrary
        .getState()
        .books.find((b) => b.id === "a");
      expect(book?.status).toBe("read");
      expect(book?.currentPage).toBe(420);
      expect(book?.totalPages).toBe(420);
    });
  });

  it("rejects currentPage > totalPages with an inline error and does not save", async () => {
    const user = userEvent.setup();
    await seed([
      makeReadingBook({ id: "a", currentPage: 100, totalPages: 200 }),
    ]);
    render(<PageProgressQuickUpdate books={useBookLibrary.getState().books} />);

    const input = screen.getByTestId("page-progress-page-input");
    fireEvent.change(input, { target: { value: "250" } });
    await user.click(screen.getByTestId("page-progress-save"));

    await waitFor(() => {
      expect(
        screen.getByTestId("page-progress-error")
      ).toBeInTheDocument();
    });
    const book = useBookLibrary.getState().books.find((b) => b.id === "a");
    expect(book?.currentPage).toBe(100);
  });

  it("does not save when the page input is empty", async () => {
    const user = userEvent.setup();
    await seed([makeReadingBook({ id: "a", currentPage: 100 })]);
    render(<PageProgressQuickUpdate books={useBookLibrary.getState().books} />);

    const input = screen.getByTestId("page-progress-page-input");
    fireEvent.change(input, { target: { value: "" } });
    const saveButton = screen.getByTestId("page-progress-save");
    expect(saveButton).toBeDisabled();
    await user.click(saveButton);

    const book = useBookLibrary.getState().books.find((b) => b.id === "a");
    expect(book?.currentPage).toBe(100);
  });
});
