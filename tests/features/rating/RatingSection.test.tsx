import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RatingSection } from "@/features/rating/RatingSection";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";
import type { Book } from "@/types/book";
import type { StorageAdapter } from "@/storage/storage-adapter";

const { mockError } = vi.hoisted(() => ({
  mockError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockError,
    success: vi.fn(),
  },
}));

let sampleBook: Book;

describe("RatingSection", () => {
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
    mockError.mockClear();
  });

  it("renders DetailSection with title 'Rating' and the stars", () => {
    render(<RatingSection book={sampleBook} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Rating" })
    ).toBeInTheDocument();
    for (const n of [1, 2, 3, 4, 5]) {
      expect(
        screen.getByTestId(`rating-star-${n}`)
      ).toBeInTheDocument();
    }
  });

  it("clicking a star calls updateBook with the new rating", async () => {
    const user = userEvent.setup();
    render(<RatingSection book={sampleBook} />);

    await user.click(screen.getByTestId("rating-star-4"));

    await waitFor(() => {
      const stored = useBookLibrary.getState().books[0];
      expect(stored?.rating).toBe(4);
    });
  });

  it("shows a toast and re-enables the stars on storage failure", async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        const err = new Error("quota");
        err.name = "QuotaExceededError";
        throw err;
      });
    const user = userEvent.setup();
    render(<RatingSection book={sampleBook} />);

    await user.click(screen.getByTestId("rating-star-3"));

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Couldn't save rating. Try again."
      );
    });
    // Stars re-enabled
    expect(screen.getByTestId("rating-star-3")).not.toBeDisabled();
    // Book rating unchanged in the store
    expect(useBookLibrary.getState().books[0]?.rating).toBeUndefined();

    setItemSpy.mockRestore();
  });

  it("disables the stars while updateBook is in flight", async () => {
    // Replace the adapter with a slow one whose updateBook never
    // resolves, so the in-flight disabled state is observable.
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
    render(<RatingSection book={book} />);

    // Don't await — the click's onClick handler is async and
    // suspends on the never-resolving updateBook promise.
    void user.click(screen.getByTestId("rating-star-4"));

    await waitFor(() => {
      expect(screen.getByTestId("rating-star-3")).toBeDisabled();
    });
  });
});
