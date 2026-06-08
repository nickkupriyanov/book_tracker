import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { LibraryClient } from "@/app/library/LibraryClient";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";

describe("LibraryClient — full shelf route (spec 015)", () => {
  beforeEach(async () => {
    __resetBookLibrary();
    localStorage.clear();
  });

  it("renders the loading state when the store has not been initialised", () => {
    __resetBookLibrary();
    render(<LibraryClient />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders the error state when the store is in 'error' status", () => {
    __resetBookLibrary();
    useBookLibrary.setState({ status: "error" });
    render(<LibraryClient />);
    expect(
      screen.getByText(/couldn't load your library/i)
    ).toBeInTheDocument();
  });

  it("renders the empty shelf when the library has no books", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    render(<LibraryClient />);
    expect(
      screen.getByRole("button", { name: /add your first book/i })
    ).toBeInTheDocument();
  });

  it("renders the full shelf controls (search, status tabs, sort, clear-filters slot) in the ready non-empty state", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<LibraryClient />);
    expect(screen.getByTestId("shelf-search")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /^All \(/ })
    ).toBeInTheDocument();
    expect(screen.getByTestId("shelf-sort")).toBeInTheDocument();
  });

  it("displays books from every status on the library page", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Want Book",
      author: "A",
      status: "want",
      tags: [],
    });
    await useBookLibrary.getState().addBook({
      title: "Reading Book",
      author: "B",
      status: "reading",
      tags: [],
    });
    await useBookLibrary.getState().addBook({
      title: "Read Book",
      author: "C",
      status: "read",
      tags: [],
    });
    render(<LibraryClient />);
    expect(screen.getByText("Want Book")).toBeInTheDocument();
    expect(screen.getByText("Reading Book")).toBeInTheDocument();
    expect(screen.getByText("Read Book")).toBeInTheDocument();
  });

  it("does not render an 'Open library' button on the library page", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<LibraryClient />);
    expect(
      screen.queryByRole("link", { name: /open library/i })
    ).not.toBeInTheDocument();
  });

  it("does not render a page-local 'Add book' button when the shelf is non-empty (spec 020 FR-12)", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<LibraryClient />);
    // The page-local button used to carry data-testid="add-book-button"
    // (defined on AddBookButton). With spec 020 it is removed from the
    // page header; the global header now exposes the add-book action.
    expect(
      screen.queryByTestId("add-book-button")
    ).not.toBeInTheDocument();
    // The only 'Add' / 'Добавить' text the library page itself contributes
    // is from book card titles / form labels — the page header must not
    // contain a page-local English 'Add book' button.
    const pageHeader = screen.getByRole("heading", {
      name: /your library/i,
    }).parentElement;
    expect(pageHeader).not.toBeNull();
    expect(
      within(pageHeader as HTMLElement).queryByRole("button", {
        name: /^add book$/i,
      })
    ).not.toBeInTheDocument();
  });
});
