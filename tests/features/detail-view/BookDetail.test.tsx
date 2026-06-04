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
});
