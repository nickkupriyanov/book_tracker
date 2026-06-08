import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    // The empty-state 'Open library' link is scoped to the
    // no-reading area; the header also has an 'Open library'
    // link, so query inside the empty-state container.
    const noReading = screen.getByTestId("home-no-reading");
    expect(
      noReading.querySelector("a[href='/library']")
    ).toBeInTheDocument();
    expect(screen.getByTestId("reading-calendar")).toBeInTheDocument();
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
    // Scope the assertion to the compact reading lane so we test that
    // the home card is rendered, not just the focus panel title.
    const grid = screen.getByTestId("reading-books-list");
    expect(within(grid).getByText("Reading Book")).toBeInTheDocument();
    expect(within(grid).queryByText("Want Book")).not.toBeInTheDocument();
    expect(within(grid).queryByText("Read Book")).not.toBeInTheDocument();
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

  it("renders the Reading Calendar on the home page when the library is non-empty", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    expect(screen.getByTestId("reading-calendar")).toBeInTheDocument();
  });

  it("renders the reader profile card above the Reading Calendar in the ready non-empty state", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    const rail = screen.getByTestId("home-calendar-rail");
    const profile = within(rail).getByTestId("reader-profile-card");
    const calendar = within(rail).getByTestId("reading-calendar");
    expect(profile).toBeInTheDocument();
    expect(calendar).toBeInTheDocument();
    expect(
      profile.compareDocumentPosition(calendar) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("does not render the reader profile card during loading", () => {
    __resetBookLibrary();
    render(<ShelfClient />);
    expect(
      screen.queryByTestId("reader-profile-card")
    ).not.toBeInTheDocument();
  });

  it("does not render the reader profile card during the error state", () => {
    __resetBookLibrary();
    useBookLibrary.setState({ status: "error" });
    render(<ShelfClient />);
    expect(
      screen.queryByTestId("reader-profile-card")
    ).not.toBeInTheDocument();
  });

  it("does not render the reader profile card on an empty library", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    render(<ShelfClient />);
    expect(
      screen.queryByTestId("reader-profile-card")
    ).not.toBeInTheDocument();
  });

  it("switches the focused progress book when a compact reading card is clicked", async () => {
    const user = userEvent.setup();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Alpha",
      author: "A",
      status: "reading",
      tags: [],
      currentPage: 10,
    });
    await useBookLibrary.getState().addBook({
      title: "Beta",
      author: "B",
      status: "reading",
      tags: [],
      currentPage: 44,
    });
    render(<ShelfClient />);

    const focus = screen.getByTestId("page-progress-quick-update");
    expect(within(focus).getByText("Beta")).toBeInTheDocument();

    const lane = screen.getByTestId("reading-books-list");
    await user.click(within(lane).getByRole("button", { name: /focus alpha/i }));

    expect(within(focus).getByText("Alpha")).toBeInTheDocument();
  });

  it("keeps book detail navigation in the focus panel, not the compact reading lane", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Alpha",
      author: "A",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);

    const focus = screen.getByTestId("page-progress-quick-update");
    expect(
      within(focus).getByRole("link", { name: /open book/i })
    ).toHaveAttribute("href", expect.stringMatching(/^\/book\//));

    const lane = screen.getByTestId("reading-books-list");
    expect(lane.querySelector("a[href^='/book/']")).not.toBeInTheDocument();
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
