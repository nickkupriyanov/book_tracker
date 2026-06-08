import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditBookDialog } from "@/features/edit-book/EditBookDialog";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";
import {
  getLastStatus,
  __resetLastStatus,
} from "@/features/add-book/last-status";
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

describe("EditBookDialog", () => {
  beforeEach(async () => {
    __resetLastStatus();
    __resetBookLibrary();
    localStorage.clear();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    // Add a book and capture the actual stored book (with the generated
    // id and createdAt) so EditBookDialog operates on a real record.
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
      <EditBookDialog
        book={sampleBook}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    return { ...utils, onOpenChange };
  }

  it("opens with pre-filled values from the book", async () => {
    renderDialog();
    await screen.findByRole("dialog");
    expect(screen.getByLabelText("Title")).toHaveValue("Piranesi");
    expect(screen.getByLabelText("Author")).toHaveValue("Susanna Clarke");
    expect(screen.getByLabelText("Status")).toHaveTextContent("Reading");
    expect(
      screen.getByRole("button", { name: "Save changes" })
    ).toBeInTheDocument();
  });

  it("pre-fills the Started and Finished date fields from the book", async () => {
    // Add a book with both dates, then open Edit on it.
    __resetBookLibrary();
    localStorage.clear();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    const bookWithDates = await useBookLibrary.getState().addBook({
      title: "Dune",
      author: "Frank Herbert",
      status: "read",
      tags: [],
      startedAt: "2026-01-01",
      finishedAt: "2026-02-01",
    });
    render(
      <EditBookDialog
        book={bookWithDates}
        open={true}
        onOpenChange={vi.fn()}
      />
    );
    await screen.findByRole("dialog");
    expect(screen.getByLabelText("Started (optional)")).toHaveValue(
      "2026-01-01"
    );
    expect(screen.getByLabelText("Finished (optional)")).toHaveValue(
      "2026-02-01"
    );
  });

  it("leaves Started and Finished empty when the book has no dates", async () => {
    // sampleBook (set in beforeEach) has no startedAt / finishedAt.
    renderDialog();
    await screen.findByRole("dialog");
    expect(screen.getByLabelText("Started (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Finished (optional)")).toHaveValue("");
  });

  it("pre-fills the Cover color field from the book (spec 013)", async () => {
    __resetBookLibrary();
    localStorage.clear();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    const bookWithColor = await useBookLibrary.getState().addBook({
      title: "Coloured Cover",
      author: "Author",
      status: "reading",
      tags: [],
      coverColor: "#b85b45",
    });
    render(
      <EditBookDialog
        book={bookWithColor}
        open={true}
        onOpenChange={vi.fn()}
      />
    );
    await screen.findByRole("dialog");
    expect(screen.getByLabelText("Cover color (optional)")).toHaveValue(
      "#b85b45"
    );
  });

  it("leaves Cover color empty when the book has none", async () => {
    renderDialog();
    await screen.findByRole("dialog");
    expect(screen.getByLabelText("Cover color (optional)")).toHaveValue("");
  });

  it("calls updateBook, shows Updated toast, and closes on valid save", async () => {
    const { onOpenChange } = renderDialog();
    await screen.findByRole("dialog");
    const user = userEvent.setup();

    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Piranesi (corrected)");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(mockSuccess).toHaveBeenCalledWith(
      'Updated "Piranesi (corrected)"'
    );

    const stored = JSON.parse(
      localStorage.getItem("book-tracker:books") || "[]"
    );
    expect(stored[0]?.title).toBe("Piranesi (corrected)");
    // id and createdAt preserved (use sampleBook's actual values, not hardcoded)
    expect(stored[0]?.id).toBe(sampleBook.id);
    expect(stored[0]?.createdAt).toBe(sampleBook.createdAt);
  });

  it("preserves currentPage when editing other book fields", async () => {
    __resetBookLibrary();
    localStorage.clear();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    const bookWithProgress = await useBookLibrary.getState().addBook({
      title: "Progress Book",
      author: "Author",
      status: "reading",
      tags: [],
      currentPage: 120,
      totalPages: 300,
    });
    render(
      <EditBookDialog
        book={bookWithProgress}
        open={true}
        onOpenChange={vi.fn()}
      />
    );
    await screen.findByRole("dialog");
    const user = userEvent.setup();

    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Progress Book Updated");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      const book = useBookLibrary
        .getState()
        .books.find((b) => b.id === bookWithProgress.id);
      expect(book?.title).toBe("Progress Book Updated");
      expect(book?.currentPage).toBe(120);
      expect(book?.totalPages).toBe(300);
    });
  });

  it("preserves readingLogs when editing other book fields", async () => {
    __resetBookLibrary();
    localStorage.clear();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    const bookWithLogs = await useBookLibrary.getState().addBook({
      title: "Logged Book",
      author: "Author",
      status: "reading",
      tags: [],
      currentPage: 120,
      readingLogs: [
        {
          id: "log-1",
          date: "2026-06-08",
          pagesRead: 40,
          currentPageAfter: 120,
          createdAt: "2026-06-08T10:00:00.000Z",
          updatedAt: "2026-06-08T10:00:00.000Z",
        },
      ],
    });
    render(
      <EditBookDialog
        book={bookWithLogs}
        open={true}
        onOpenChange={vi.fn()}
      />
    );
    await screen.findByRole("dialog");
    const user = userEvent.setup();

    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Logged Book Updated");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      const book = useBookLibrary
        .getState()
        .books.find((b) => b.id === bookWithLogs.id);
      expect(book?.title).toBe("Logged Book Updated");
      expect(book?.readingLogs).toEqual(bookWithLogs.readingLogs);
    });
  });

  it("shows a visible totalPages error when totalPages is lower than currentPage", async () => {
    __resetBookLibrary();
    localStorage.clear();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    const bookWithProgress = await useBookLibrary.getState().addBook({
      title: "Progress Book",
      author: "Author",
      status: "reading",
      tags: [],
      currentPage: 120,
      totalPages: 300,
    });
    render(
      <EditBookDialog
        book={bookWithProgress}
        open={true}
        onOpenChange={vi.fn()}
      />
    );
    await screen.findByRole("dialog");
    const user = userEvent.setup();

    const totalPages = screen.getByLabelText("Total pages (optional)");
    await user.clear(totalPages);
    await user.type(totalPages, "100");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(
        screen.getByText(/current page must be 100 or fewer/i)
      ).toBeInTheDocument();
    });
    expect(totalPages).toHaveAttribute("aria-invalid", "true");
  });

  it("does not update last-status on edit (D2 of spec 002)", async () => {
    renderDialog();
    await screen.findByRole("dialog");
    const user = userEvent.setup();

    expect(getLastStatus()).toBe("want");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(getLastStatus()).toBe("want");
    });
  });

  it("shows validation errors and keeps dialog open on bad input", async () => {
    renderDialog();
    await screen.findByRole("dialog");
    const user = userEvent.setup();

    const coverInput = screen.getByLabelText(/cover url/i);
    await user.clear(coverInput);
    await user.type(coverInput, "not-a-url");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(screen.getByText(/http/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // No toast
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it("shows form error and preserves fields on storage failure", async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        const err = new Error("quota");
        err.name = "QuotaExceededError";
        throw err;
      });
    const { onOpenChange } = renderDialog();
    await screen.findByRole("dialog");
    const user = userEvent.setup();

    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "New Title");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/couldn't save/i);
    });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(titleInput).toHaveValue("New Title");

    setItemSpy.mockRestore();
  });
});
