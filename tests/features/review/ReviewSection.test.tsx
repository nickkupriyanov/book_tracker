import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

function TestHost({ bookId }: { bookId: string }) {
  const books = useBookLibrary((s) => s.books);
  const book = books.find((b) => b.id === bookId);
  if (!book) return null;
  return <ReviewSection book={book} />;
}

describe("ReviewSection (spec 008)", () => {
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

  it("renders the legacy plain review text and an 'Edit review' button in read mode", async () => {
    await useBookLibrary
      .getState()
      .updateBook(sampleBook.id, {
        ...sampleBook,
        review: "Loved this book. A quiet masterpiece.",
      });
    render(<TestHost bookId={sampleBook.id} />);
    expect(screen.getByTestId("review-paragraph")).toHaveTextContent(
      "Loved this book. A quiet masterpiece."
    );
    expect(screen.getByTestId("review-edit-button")).toHaveTextContent(
      "Edit review"
    );
  });

  it("renders the rich review via the walker in read mode", async () => {
    await useBookLibrary.getState().updateBook(sampleBook.id, {
      ...sampleBook,
      review: {
        format: "rich",
        body: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Hello " },
                { type: "text", marks: [{ type: "bold" }], text: "world" },
              ],
            },
          ],
        },
      },
    });
    render(<TestHost bookId={sampleBook.id} />);
    const rich = screen.getByTestId("review-rich");
    expect(rich.querySelector("strong")?.textContent).toBe("world");
  });

  it("renders 'No review yet.' and a 'Write review' button in read mode (book without review)", () => {
    render(<TestHost bookId={sampleBook.id} />);
    expect(screen.getByTestId("review-empty")).toHaveTextContent(
      "No review yet."
    );
    expect(screen.getByTestId("review-edit-button")).toHaveTextContent(
      "Write review"
    );
  });

  it("clicking 'Edit review' opens the ReviewEditor with the existing content", async () => {
    await useBookLibrary
      .getState()
      .updateBook(sampleBook.id, {
        ...sampleBook,
        review: "Existing review text",
      });
    const user = userEvent.setup();
    render(<TestHost bookId={sampleBook.id} />);
    await user.click(screen.getByTestId("review-edit-button"));
    const editor = await screen.findByTestId("review-editor");
    expect(editor.textContent).toContain("Existing review text");
    expect(screen.getByTestId("review-save-button")).toBeInTheDocument();
    expect(screen.getByTestId("review-cancel-button")).toBeInTheDocument();
  });

  it("clicking 'Write review' opens the ReviewEditor with empty content", async () => {
    const user = userEvent.setup();
    render(<TestHost bookId={sampleBook.id} />);
    await user.click(screen.getByTestId("review-edit-button"));
    const editor = await screen.findByTestId("review-editor");
    expect(editor.textContent).toBe("");
  });

  it("clicking Cancel returns to read mode without calling updateBook", async () => {
    const user = userEvent.setup();
    render(<TestHost bookId={sampleBook.id} />);
    await user.click(screen.getByTestId("review-edit-button"));
    await screen.findByTestId("review-cancel-button");
    await user.click(screen.getByTestId("review-cancel-button"));
    expect(screen.getByTestId("review-empty")).toBeInTheDocument();
    expect(useBookLibrary.getState().books[0]?.review).toBeUndefined();
  });

  it("clicking Save calls updateBook and returns to read mode with the new content", async () => {
    const user = userEvent.setup();
    render(<TestHost bookId={sampleBook.id} />);
    await user.click(screen.getByTestId("review-edit-button"));
    const editor = (await screen.findByTestId("review-editor")).querySelector(
      ".tiptap"
    ) as HTMLElement | null;
    expect(editor).not.toBeNull();
    editor?.focus();
    await user.keyboard("A wonderful read.");
    await user.click(screen.getByTestId("review-save-button"));

    await waitFor(() => {
      expect(screen.getByTestId("review-paragraph")).toHaveTextContent(
        "A wonderful read."
      );
    });
    const saved = useBookLibrary.getState().books[0]?.review;
    expect(saved).toEqual({ format: "plain", body: "A wonderful read." });
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
    const editor = (await screen.findByTestId("review-editor")).querySelector(
      ".tiptap"
    ) as HTMLElement | null;
    expect(editor).not.toBeNull();
    editor?.focus();
    await user.keyboard("Some text.");
    await user.click(screen.getByTestId("review-save-button"));

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Couldn't save review. Try again."
      );
    });
    // Still in edit mode (editor still present).
    expect(screen.getByTestId("review-editor")).toBeInTheDocument();
    // Store unchanged.
    expect(useBookLibrary.getState().books[0]?.review).toBeUndefined();

    setItemSpy.mockRestore();
  });

  it("disables save and cancel while updateBook is in flight", async () => {
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
      getAnnualReadingChallenge: vi.fn().mockResolvedValue(null),
      saveAnnualReadingChallenge: vi.fn().mockImplementation(
        () => new Promise<never>(() => {})
      ),
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
    const editor = (await screen.findByTestId("review-editor")).querySelector(
      ".tiptap"
    ) as HTMLElement | null;
    expect(editor).not.toBeNull();
    editor?.focus();
    await user.keyboard("Draft.");
    void user.click(screen.getByTestId("review-save-button"));

    await waitFor(() => {
      expect(screen.getByTestId("review-save-button")).toHaveTextContent(
        "Saving…"
      );
    });
    expect(screen.getByTestId("review-cancel-button")).toBeDisabled();
  });

  it("emptying the editor and clicking Save clears the review and shows a success toast", async () => {
    await useBookLibrary.getState().updateBook(sampleBook.id, {
      ...sampleBook,
      review: "Some old text",
    });
    const user = userEvent.setup();
    render(<TestHost bookId={sampleBook.id} />);
    await user.click(screen.getByTestId("review-edit-button"));
    await screen.findByTestId("review-editor");
    // Click Save without typing anything — the editor is prefilled
    // with the old text, so the user has to clear it first.
    // Simulate clearing by clicking into the editor and pressing
    // Ctrl+A then Delete via user.keyboard.
    const tiptap = (await screen.findByTestId("review-editor")).querySelector(
      ".tiptap"
    ) as HTMLElement | null;
    expect(tiptap).not.toBeNull();
    tiptap?.focus();
    await user.keyboard("{Control>}a{/Control}{Delete}");
    await user.click(screen.getByTestId("review-save-button"));

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledWith("Review deleted.");
    });
    await waitFor(() => {
      expect(useBookLibrary.getState().books[0]?.review).toBeUndefined();
    });
    expect(screen.getByTestId("review-empty")).toBeInTheDocument();
  });
});
