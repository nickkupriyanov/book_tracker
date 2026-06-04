import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteBookDialog } from "@/features/delete-book/DeleteBookDialog";
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

describe("DeleteBookDialog", () => {
  beforeEach(async () => {
    __resetBookLibrary();
    localStorage.clear();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    // Add a book and capture the actual stored record (with the
    // generated id and createdAt) so DeleteBookDialog operates on a
    // real book.
    sampleBook = await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: ["fiction"],
    });
    mockSuccess.mockClear();
  });

  function renderDialog() {
    const onOpenChange = vi.fn();
    const utils = render(
      <DeleteBookDialog
        book={sampleBook}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    return { ...utils, onOpenChange };
  }

  it("opens with the book title, author, and undo warning visible", async () => {
    renderDialog();
    await screen.findByRole("alertdialog");
    expect(
      screen.getByRole("heading", { name: /Delete "Piranesi"\?/ })
    ).toBeInTheDocument();
    expect(screen.getByText(/Susanna Clarke/)).toBeInTheDocument();
    expect(screen.getByText(/This can't be undone/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete" })
    ).toBeInTheDocument();
  });

  it("Cancel click closes the dialog and does not delete the book", async () => {
    const { onOpenChange } = renderDialog();
    await screen.findByRole("alertdialog");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(mockSuccess).not.toHaveBeenCalled();

    // Book is still in storage
    const stored = JSON.parse(
      localStorage.getItem("book-tracker:books") || "[]"
    );
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(sampleBook.id);

    // Book is still in the store
    expect(useBookLibrary.getState().books).toHaveLength(1);
  });

  it("Delete click calls deleteBook, toasts, and closes on success", async () => {
    const { onOpenChange } = renderDialog();
    await screen.findByRole("alertdialog");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(mockSuccess).toHaveBeenCalledWith('Deleted "Piranesi"');

    // Book is gone from storage
    const stored = JSON.parse(
      localStorage.getItem("book-tracker:books") || "[]"
    );
    expect(stored).toEqual([]);

    // Book is gone from the store
    expect(useBookLibrary.getState().books).toEqual([]);
  });

  it("shows form error and keeps dialog open on storage failure", async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        const err = new Error("quota");
        err.name = "QuotaExceededError";
        throw err;
      });
    const { onOpenChange } = renderDialog();
    await screen.findByRole("alertdialog");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /couldn't delete/i
      );
    });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(mockSuccess).not.toHaveBeenCalled();
    // Buttons re-enabled (back to "Delete" label, not "Deleting…")
    expect(
      screen.getByRole("button", { name: "Delete" })
    ).toBeInTheDocument();

    // Book is still in storage
    const stored = JSON.parse(
      localStorage.getItem("book-tracker:books") || "[]"
    );
    expect(stored).toHaveLength(1);

    setItemSpy.mockRestore();
  });
});
