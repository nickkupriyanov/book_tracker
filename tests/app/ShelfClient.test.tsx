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

  it("shows the no-reading empty state with an 'Open library' link when the library has books but none are reading", async () => {
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
    // The no-reading state gets a scoped route back to the
    // library so the reader can mark a book as in progress.
    const noReading = screen.getByTestId("home-no-reading");
    expect(
      within(noReading).getByRole("link", { name: /open library/i })
    ).toHaveAttribute("href", "/library");
    expect(screen.getByTestId("reading-calendar")).toBeInTheDocument();
  });

  it("does not render an 'Open library' CTA on the home page in the ready non-empty state (spec 020 FR-4)", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    // Header has navigation, but no button or link labelled
    // 'Open library' should appear anywhere on the home page.
    expect(
      screen.queryByRole("link", { name: /open library/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open library/i })
    ).not.toBeInTheDocument();
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

  it("renders the reader profile card in the top mobile slot before the home content", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    const profileSlot = screen.getByTestId("home-profile-slot");
    const profile = within(profileSlot).getByTestId("reader-profile-card");
    const readingList = screen.getByTestId("reading-books-list");
    expect(profile).toBeInTheDocument();
    expect(
      profile.compareDocumentPosition(readingList) &
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

  it("renders the yearly challenge card before the Reading Calendar in the secondary rail", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    const profileSlot = screen.getByTestId("home-profile-slot");
    const rail = screen.getByTestId("home-calendar-rail");
    const profile = within(profileSlot).getByTestId("reader-profile-card");
    const challenge = within(rail).getByTestId("yearly-challenge-card");
    const calendar = within(rail).getByTestId("reading-calendar");
    // Mobile/default DOM order: Profile < Challenge < Calendar.
    expect(
      profile.compareDocumentPosition(challenge) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      challenge.compareDocumentPosition(calendar) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("does not render the yearly challenge card during loading", () => {
    __resetBookLibrary();
    render(<ShelfClient />);
    expect(
      screen.queryByTestId("yearly-challenge-card")
    ).not.toBeInTheDocument();
  });

  it("does not render the yearly challenge card during the error state", () => {
    __resetBookLibrary();
    useBookLibrary.setState({ status: "error" });
    render(<ShelfClient />);
    expect(
      screen.queryByTestId("yearly-challenge-card")
    ).not.toBeInTheDocument();
  });

  it("does not render the yearly challenge card on an empty library", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    render(<ShelfClient />);
    expect(
      screen.queryByTestId("yearly-challenge-card")
    ).not.toBeInTheDocument();
  });

  it("persists a target through the home-rail save action", async () => {
    const user = userEvent.setup();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<ShelfClient />);
    const card = screen.getByTestId("yearly-challenge-card");
    const input = within(card).getByTestId("yearly-challenge-input");
    await user.clear(input);
    await user.type(input, "18");
    await user.click(within(card).getByTestId("yearly-challenge-save"));
    // The store should now hold a saved challenge for the
    // current year, which the home rail renders as "0 / 18".
    expect(useBookLibrary.getState().challenge?.targetBooks).toBe(18);
    expect(
      within(card).getByTestId("yearly-challenge-progress")
    ).toHaveTextContent("0 / 18");
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
