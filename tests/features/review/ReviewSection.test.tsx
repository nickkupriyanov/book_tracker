import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewSection } from "@/features/review/ReviewSection";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";
import type { Book } from "@/types/book";
import type { StorageAdapter } from "@/storage/storage-adapter";

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

/**
 * Test-only wrapper that subscribes to the store and
 * re-renders <ReviewSection> with the fresh book. This
 * mirrors the production path (BookDetail subscribes and
 * passes the derived book down) so the component reacts
 * to store changes — without it, the unit-level
 * <ReviewSection> wouldn't re-render after updateBook.
 */
function TestHost({ bookId }: { bookId: string }) {
  const books = useBookLibrary((s) => s.books);
  const book = books.find((b) => b.id === bookId);
  if (!book) return null;
  return <ReviewSection book={book} />;
}

describe("ReviewSection", () => {
  beforeEach(async () => {
    __resetBookLibrary();
    localStorage.clear();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    sampleBook = await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    mockSuccess.mockClear();
    mockError.mockClear();
  });

  it("renders the review text and an 'Edit review' button in read mode (book with review)", async () => {
    await useBookLibrary
      .getState()
      .updateBook(sampleBook.id, {
        ...sampleBook,
        review: "Loved this book. A quiet masterpiece.",
      });
    render(<TestHost bookId={sampleBook.id} />);
    expect(
      screen.getByTestId("review-text")
    ).toHaveTextContent("Loved this book. A quiet masterpiece.");
    expect(
      screen.getByTestId("review-edit-button")
    ).toHaveTextContent("Edit review");
  });

  it("renders 'No review yet.' and a 'Write review' button in read mode (book without review)", () => {
    render(<TestHost bookId={sampleBook.id} />);
    expect(screen.getByTestId("review-empty")).toHaveTextContent(
      "No review yet."
    );
    expect(
      screen.getByTestId("review-edit-button")
    ).toHaveTextContent("Write review");
  });

  it("clicking 'Edit review' switches to edit mode with pre-filled textarea", async () => {
    await useBookLibrary
      .getState()
      .updateBook(sampleBook.id, {
        ...sampleBook,
        review: "Existing review text",
      });
    const user = userEvent.setup();
    render(<TestHost bookId={sampleBook.id} />);
    await user.click(screen.getByTestId("review-edit-button"));
    const textarea = screen.getByTestId(
      "review-textarea"
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe("Existing review text");
  });

  it("clicking 'Write review' switches to edit mode with empty textarea", async () => {
    const user = userEvent.setup();
    render(<TestHost bookId={sampleBook.id} />);
    await user.click(screen.getByTestId("review-edit-button"));
    const textarea = screen.getByTestId(
      "review-textarea"
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
  });

  it("clicking Cancel returns to read mode without calling updateBook", async () => {
    const user = userEvent.setup();
    render(<TestHost bookId={sampleBook.id} />);
    await user.click(screen.getByTestId("review-edit-button"));
    const textarea = screen.getByTestId(
      "review-textarea"
    ) as HTMLTextAreaElement;
    await user.type(textarea, "Some draft that should be discarded");
    await user.click(screen.getByTestId("review-cancel-button"));
    // Back in read mode (no review saved).
    expect(screen.getByTestId("review-empty")).toBeInTheDocument();
    // Store still has no review.
    expect(useBookLibrary.getState().books[0]?.review).toBeUndefined();
  });

  it("clicking Save calls updateBook with the new review and returns to read mode", async () => {
    const user = userEvent.setup();
    render(<TestHost bookId={sampleBook.id} />);
    await user.click(screen.getByTestId("review-edit-button"));
    const textarea = screen.getByTestId(
      "review-textarea"
    ) as HTMLTextAreaElement;
    await user.type(textarea, "A wonderful read.");
    await user.click(screen.getByTestId("review-save-button"));

    await waitFor(() => {
      expect(
        screen.getByTestId("review-text")
      ).toHaveTextContent("A wonderful read.");
    });
    expect(useBookLibrary.getState().books[0]?.review).toBe(
      "A wonderful read."
    );
  });

  it("empty draft + Save deletes the review (D3 / D8)", async () => {
    // Set up a book with a review, then enter edit mode and clear.
    await useBookLibrary
      .getState()
      .updateBook(sampleBook.id, { ...sampleBook, review: "Old text" });
    const user = userEvent.setup();
    render(<TestHost bookId={sampleBook.id} />);
    await user.click(screen.getByTestId("review-edit-button"));
    const textarea = screen.getByTestId(
      "review-textarea"
    ) as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.click(screen.getByTestId("review-save-button"));

    await waitFor(() => {
      expect(useBookLibrary.getState().books[0]?.review).toBeUndefined();
    });
    expect(screen.getByTestId("review-empty")).toBeInTheDocument();
  });

  it("shows an inline error and stays in edit mode for too-long input", async () => {
    const user = userEvent.setup();
    render(<TestHost bookId={sampleBook.id} />);
    await user.click(screen.getByTestId("review-edit-button"));
    const textarea = screen.getByTestId(
      "review-textarea"
    ) as HTMLTextAreaElement;
    // Paste a string of 10 001 chars.
    const longText = "a".repeat(10_001);
    fireEvent.change(textarea, { target: { value: longText } });
    await user.click(screen.getByTestId("review-save-button"));
    // Inline error visible; still in edit mode.
    expect(screen.getByRole("alert")).toHaveTextContent(
      /10[, ]?000 characters or fewer/
    );
    expect(screen.getByTestId("review-textarea")).toBeInTheDocument();
    // Store unchanged (no review).
    expect(useBookLibrary.getState().books[0]?.review).toBeUndefined();
  });

  it("shows a toast and stays in edit mode on storage failure", async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        const err = new Error("quota");
        err.name = "QuotaExceededError";
        throw err;
      });
    const user = userEvent.setup();
    render(<TestHost bookId={sampleBook.id} />);
    await user.click(screen.getByTestId("review-edit-button"));
    const textarea = screen.getByTestId(
      "review-textarea"
    ) as HTMLTextAreaElement;
    await user.type(textarea, "Some text.");
    await user.click(screen.getByTestId("review-save-button"));

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Couldn't save review. Try again."
      );
    });
    // Still in edit mode (textarea still present).
    expect(screen.getByTestId("review-textarea")).toBeInTheDocument();
    // Store unchanged.
    expect(useBookLibrary.getState().books[0]?.review).toBeUndefined();

    setItemSpy.mockRestore();
  });

  it("disables the textarea and buttons while updateBook is in flight", async () => {
    // Slow adapter: updateBook never resolves.
    __resetBookLibrary();
    localStorage.clear();
    const slowAdapter: StorageAdapter = {
      listBooks: vi.fn().mockResolvedValue([]),
      addBook: vi.fn().mockImplementation((input) =>
        Promise.resolve({
          ...input,
          id: "slow-id",
          createdAt: new Date().toISOString(),
        })
      ),
      updateBook: vi.fn().mockImplementation(
        () => new Promise<Book>(() => {})
      ),
      deleteBook: vi.fn().mockResolvedValue(undefined),
    };
    await useBookLibrary.getState().init(slowAdapter);
    const book = await useBookLibrary.getState().addBook({
      title: "X",
      author: "x",
      status: "reading",
      tags: [],
    });

    const user = userEvent.setup();
    render(<TestHost bookId={book.id} />);
    await user.click(screen.getByTestId("review-edit-button"));
    const textarea = screen.getByTestId(
      "review-textarea"
    ) as HTMLTextAreaElement;
    await user.type(textarea, "Draft.");

    // Don't await — the click's onClick handler is async and
    // suspends on the never-resolving updateBook promise.
    void user.click(screen.getByTestId("review-save-button"));

    await waitFor(() => {
      expect(textarea).toBeDisabled();
    });
    expect(screen.getByTestId("review-cancel-button")).toBeDisabled();
    expect(screen.getByTestId("review-save-button")).toBeDisabled();
  });
});
