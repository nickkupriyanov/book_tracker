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
    const shelf = document.querySelector("[data-testid='home-shelf-area']");
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

describe("ShelfClient — responsive page layout (spec 014)", () => {
  beforeEach(async () => {
    __resetBookLibrary();
    localStorage.clear();
  });

  it("renders every state inside the shared page container", async () => {
    // Loading state — no init, status stays at the initial "loading".
    __resetBookLibrary();
    const { unmount } = render(<ShelfClient />);
    expect(screen.getByTestId("page-container")).toHaveClass("max-w-6xl");
    unmount();

    // Error state — set directly to avoid wiring a failing adapter.
    __resetBookLibrary();
    useBookLibrary.setState({ status: "error" });
    const { unmount: unmount2 } = render(<ShelfClient />);
    expect(screen.getByTestId("page-container")).toHaveClass("max-w-6xl");
    unmount2();

    // Empty state.
    __resetBookLibrary();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    const { unmount: unmount3 } = render(<ShelfClient />);
    expect(screen.getByTestId("page-container")).toHaveClass("max-w-6xl");
    unmount3();

    // Ready non-empty state.
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    expect(screen.getByTestId("page-container")).toHaveClass("max-w-6xl");
  });

  it("places the calendar rail and the shelf area inside the home layout in the ready non-empty state", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);

    expect(screen.getByTestId("home-calendar-rail")).toBeInTheDocument();
    expect(screen.getByTestId("home-shelf-area")).toBeInTheDocument();
  });

  it("keeps the Reading Calendar before the shelf in DOM order in the ready non-empty state", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);

    const rail = screen.getByTestId("home-calendar-rail");
    const shelf = screen.getByTestId("home-shelf-area");
    expect(
      rail.compareDocumentPosition(shelf) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
