import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookDetail } from "@/features/detail-view/BookDetail";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";
import type { Book } from "@/types/book";

const { mockSuccess, mockError } = vi.hoisted(() => ({
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));

const { mockPush } = vi.hoisted(() => ({
  mockPush: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockSuccess,
    error: mockError,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({}),
}));

let sampleBook: Book;

describe("BookDetail", () => {
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
    mockPush.mockClear();
  });

  it("renders the loading state when the store is loading", () => {
    // Put the store back into the initial 'loading' state after
    // the beforeEach has already init'd it.
    __resetBookLibrary();
    render(<BookDetail bookId={sampleBook.id} />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it("renders the not-found state when the book id is missing", () => {
    render(<BookDetail bookId="nonexistent-id" />);
    expect(
      screen.getByRole("heading", { name: /Book not found/ })
    ).toBeInTheDocument();
  });

  it("renders the book details when the book exists", () => {
    render(<BookDetail bookId={sampleBook.id} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Piranesi" })
    ).toBeInTheDocument();
    expect(screen.getByText("Susanna Clarke")).toBeInTheDocument();
  });

  it("opens the Edit dialog on edit click and updates the page on save", async () => {
    const user = userEvent.setup();
    render(<BookDetail bookId={sampleBook.id} />);

    await user.click(screen.getByRole("button", { name: "Edit book" }));
    await screen.findByRole("heading", { name: "Edit book" });

    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Piranesi (corrected)");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Piranesi (corrected)",
        })
      ).toBeInTheDocument();
    });
    expect(mockSuccess).toHaveBeenCalledWith(
      'Updated "Piranesi (corrected)"'
    );
  });

  it("opens the Delete dialog on delete click and navigates to / on confirm", async () => {
    const user = userEvent.setup();
    render(<BookDetail bookId={sampleBook.id} />);

    await user.click(screen.getByRole("button", { name: "Delete book" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
    expect(mockSuccess).toHaveBeenCalledWith('Deleted "Piranesi"');
  });

  describe("rating section (spec 006)", () => {
    it("renders the Rating section visible with 5 empty stars for an unrated book", () => {
      render(<BookDetail bookId={sampleBook.id} />);
      expect(
        screen.getByRole("heading", { level: 2, name: "Rating" })
      ).toBeInTheDocument();
      // All 5 stars are present and empty (fill-none).
      for (const n of [1, 2, 3, 4, 5]) {
        const icon = screen
          .getByTestId(`rating-star-${n}`)
          .querySelector("svg");
        expect(icon).toHaveClass("fill-none");
      }
    });

    it("reflects the current rating in the stars for a rated book", async () => {
      const rated = await useBookLibrary.getState().addBook({
        title: "Already rated",
        author: "Test",
        status: "read",
        tags: [],
        rating: 4,
      });
      render(<BookDetail bookId={rated.id} />);
      // Stars 1..4 filled, star 5 empty.
      for (const n of [1, 2, 3, 4]) {
        const icon = screen
          .getByTestId(`rating-star-${n}`)
          .querySelector("svg");
        expect(icon).toHaveClass("fill-current");
      }
      const star5 = screen
        .getByTestId("rating-star-5")
        .querySelector("svg");
      expect(star5).toHaveClass("fill-none");
    });

    it("clicking a star on the section updates the page", async () => {
      const user = userEvent.setup();
      render(<BookDetail bookId={sampleBook.id} />);

      // Click star 3 on the page.
      await user.click(screen.getByTestId("rating-star-3"));

      // The page re-renders with 3 filled, 2 empty.
      await waitFor(() => {
        const star3 = screen
          .getByTestId("rating-star-3")
          .querySelector("svg");
        expect(star3).toHaveClass("fill-current");
      });
      for (const n of [4, 5]) {
        const icon = screen
          .getByTestId(`rating-star-${n}`)
          .querySelector("svg");
        expect(icon).toHaveClass("fill-none");
      }
    });
  });

  describe("review section (spec 007)", () => {
    it("renders the Review section visible for a found book with no review", () => {
      render(<BookDetail bookId={sampleBook.id} />);
      expect(
        screen.getByRole("heading", { level: 2, name: "Review" })
      ).toBeInTheDocument();
      expect(screen.getByTestId("review-empty")).toHaveTextContent(
        "No review yet."
      );
    });

    it("renders the review text for a book with a review", async () => {
      await useBookLibrary
        .getState()
        .updateBook(sampleBook.id, {
          ...sampleBook,
          review: "A quiet, wonderful read.",
        });
      render(<BookDetail bookId={sampleBook.id} />);
      expect(
        screen.getByTestId("review-text")
      ).toHaveTextContent("A quiet, wonderful read.");
      expect(
        screen.getByTestId("review-edit-button")
      ).toHaveTextContent("Edit review");
    });
  });
});
