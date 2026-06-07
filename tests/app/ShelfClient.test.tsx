import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShelfClient } from "@/app/ShelfClient";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";

describe("ShelfClient — Reading Calendar integration (spec 013)", () => {
  beforeEach(async () => {
    __resetBookLibrary();
    localStorage.clear();
  });

  it("renders the Reading Calendar above the shelf when status is ready and library is non-empty", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    const calendar = screen.getByTestId("reading-calendar");
    expect(calendar).toBeInTheDocument();
    // Both the calendar and the shelf list are present.
    expect(screen.getByTestId("reading-calendar")).toBeInTheDocument();
    // The calendar appears before the shelf list in the DOM.
    const shelf = document.querySelector(
      "[data-testid='shelf-list'], main ul, main > div"
    );
    expect(calendar.compareDocumentPosition(shelf ?? document.body) &
      Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not render the Reading Calendar when the library is empty", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    render(<ShelfClient />);
    expect(
      screen.queryByTestId("reading-calendar")
    ).not.toBeInTheDocument();
  });

  it("does not render the Reading Calendar while the store is loading", () => {
    // Don't init the store — status stays at the initial "loading".
    __resetBookLibrary();
    render(<ShelfClient />);
    expect(
      screen.queryByTestId("reading-calendar")
    ).not.toBeInTheDocument();
  });
});
