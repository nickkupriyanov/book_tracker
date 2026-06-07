import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShelfClient } from "@/app/ShelfClient";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";

describe("ShelfClient — focused reading home (spec 015)", () => {
  beforeEach(async () => {
    __resetBookLibrary();
    localStorage.clear();
  });

  it("renders the loading state when the store has not been initialised", () => {
    __resetBookLibrary();
    render(<ShelfClient />);
    expect(screen.getByText(/loading your library/i)).toBeInTheDocument();
  });

  it("renders the error state when the store is in 'error' status", () => {
    __resetBookLibrary();
    useBookLibrary.setState({ status: "error" });
    render(<ShelfClient />);
    expect(
      screen.getByText(/couldn't load your library/i)
    ).toBeInTheDocument();
  });

  it("renders the empty-shelf affordance when the library is empty", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    render(<ShelfClient />);
    expect(
      screen.getByRole("button", { name: /add your first book/i })
    ).toBeInTheDocument();
  });

  it("shows the no-reading empty state with 'Open library' when the library has books but none are reading", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Want Book",
      author: "A",
      status: "want",
      tags: [],
    });
    await useBookLibrary.getState().addBook({
      title: "Read Book",
      author: "C",
      status: "read",
      tags: [],
    });
    render(<ShelfClient />);
    expect(screen.getByText(/no books in progress/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open library/i })
    ).toBeInTheDocument();
  });

  it("renders the 'Open library' link on the home page in the ready non-empty state", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    expect(
      screen.getByRole("link", { name: /open library/i })
    ).toBeInTheDocument();
  });

  it("shows only reading books on the home page (excludes want and read)", async () => {
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
    render(<ShelfClient />);
    expect(screen.getByText("Reading Book")).toBeInTheDocument();
    expect(screen.queryByText("Want Book")).not.toBeInTheDocument();
    expect(screen.queryByText("Read Book")).not.toBeInTheDocument();
  });

  it("does not render the shelf search input on the home page", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    expect(screen.queryByTestId("shelf-search")).not.toBeInTheDocument();
  });

  it("does not render the shelf status tabs on the home page", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    expect(screen.queryByRole("tab", { name: /^All/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /^Reading/ })
    ).not.toBeInTheDocument();
  });

  it("does not render the shelf sort menu on the home page", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    expect(screen.queryByTestId("shelf-sort")).not.toBeInTheDocument();
  });

  it("does not render the Reading Calendar on the home page", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    expect(
      screen.queryByTestId("reading-calendar")
    ).not.toBeInTheDocument();
  });
});

describe("ShelfClient — page container (spec 014, preserved on focused home)", () => {
  beforeEach(async () => {
    __resetBookLibrary();
    localStorage.clear();
  });

  it("renders every state inside the shared page container", async () => {
    __resetBookLibrary();
    const { unmount } = render(<ShelfClient />);
    expect(screen.getByTestId("page-container")).toHaveClass("max-w-6xl");
    unmount();

    __resetBookLibrary();
    useBookLibrary.setState({ status: "error" });
    const { unmount: unmount2 } = render(<ShelfClient />);
    expect(screen.getByTestId("page-container")).toHaveClass("max-w-6xl");
    unmount2();

    __resetBookLibrary();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    const { unmount: unmount3 } = render(<ShelfClient />);
    expect(screen.getByTestId("page-container")).toHaveClass("max-w-6xl");
    unmount3();

    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    expect(screen.getByTestId("page-container")).toHaveClass("max-w-6xl");
  });
});
