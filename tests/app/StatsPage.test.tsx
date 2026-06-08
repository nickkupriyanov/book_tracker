import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Page from "@/app/stats/page";
import { StatsClient } from "@/app/stats/StatsClient";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";
import type { Book, ReadingLog } from "@/types/book";

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Untitled",
    author: overrides.author ?? "Anonymous",
    status: overrides.status ?? "want",
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeLog(overrides: Partial<ReadingLog> = {}): ReadingLog {
  return {
    id: overrides.id ?? "log-1",
    date: overrides.date ?? "2026-06-15",
    pagesRead: overrides.pagesRead ?? 10,
    currentPageAfter: overrides.currentPageAfter ?? 10,
    createdAt: overrides.createdAt ?? "2026-06-15T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-06-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("StatsPage wrapper", () => {
  it("renders inside the shared page container", () => {
    render(<Page />);
    expect(screen.getByTestId("page-container")).toBeInTheDocument();
  });

  it("renders the Statistics heading", () => {
    render(<Page />);
    expect(
      screen.getByRole("heading", { name: /statistics/i })
    ).toBeInTheDocument();
  });

  it("no longer renders the placeholder copy", () => {
    render(<Page />);
    expect(
      screen.queryByText(/reading statistics will live here/i)
    ).not.toBeInTheDocument();
  });
});

describe("StatsClient — store states (spec 021 T2)", () => {
  beforeEach(() => {
    __resetBookLibrary();
    localStorage.clear();
  });

  it("renders the loading state when the store has not been initialised", () => {
    __resetBookLibrary();
    render(<StatsClient />);
    expect(screen.getByTestId("stats-loading")).toBeInTheDocument();
    expect(
      screen.queryByTestId("stats-portrait")
    ).not.toBeInTheDocument();
  });

  it("renders the error state when the store is in 'error' status", () => {
    __resetBookLibrary();
    useBookLibrary.setState({ status: "error" });
    render(<StatsClient />);
    expect(screen.getByTestId("stats-error")).toBeInTheDocument();
    expect(
      screen.queryByTestId("stats-portrait")
    ).not.toBeInTheDocument();
  });

  it("renders the empty-shelf affordance in the ready empty state", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    render(<StatsClient />);
    expect(screen.getByTestId("stats-empty")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add your first book/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("stats-portrait")
    ).not.toBeInTheDocument();
  });

  it("renders the portrait wrapper when the library is populated", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<StatsClient />);
    expect(screen.getByTestId("stats-portrait")).toBeInTheDocument();
  });
});

describe("StatsClient — Reader Portrait zones (spec 021 T3)", () => {
  beforeEach(() => {
    __resetBookLibrary();
    localStorage.clear();
  });

  it("renders the five approved zones in a populated library", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "read",
      tags: ["fantasy", "classic"],
      rating: 5,
      finishedAt: "2026-05-15",
      readingLogs: [makeLog({ id: "l1", date: "2026-05-14", pagesRead: 40 })],
    });
    await useBookLibrary.getState().addBook({
      title: "The Lord of the Rings",
      author: "J. R. R. Tolkien",
      status: "read",
      tags: ["fantasy"],
      rating: 4,
      finishedAt: "2026-04-01",
    });
    await useBookLibrary.getState().addBook({
      title: "An Untitled Draft",
      author: "Mystery",
      status: "reading",
      tags: [],
    });
    await useBookLibrary.getState().addBook({
      title: "On the Pile",
      author: "Stack",
      status: "want",
      tags: [],
    });

    render(<StatsClient />);
    expect(screen.getByTestId("stats-portrait")).toBeInTheDocument();
    expect(screen.getByTestId("stats-hero")).toBeInTheDocument();
    expect(screen.getByTestId("stats-favorite-tags")).toBeInTheDocument();
    expect(screen.getByTestId("stats-top-rated")).toBeInTheDocument();
    expect(screen.getByTestId("stats-rhythm")).toBeInTheDocument();
    expect(screen.getByTestId("stats-shelf")).toBeInTheDocument();
  });

  it("hero metrics reflect the populated library", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "read",
      tags: ["fantasy"],
      rating: 5,
      finishedAt: "2026-05-15",
    });
    await useBookLibrary.getState().addBook({
      title: "The Lord of the Rings",
      author: "J. R. R. Tolkien",
      status: "read",
      tags: ["fantasy"],
      rating: 4,
    });
    await useBookLibrary.getState().addBook({
      title: "Dune",
      author: "Frank Herbert",
      status: "reading",
      tags: [],
    });
    render(<StatsClient />);

    expect(screen.getByTestId("stats-hero-read")).toHaveTextContent("2");
    expect(screen.getByTestId("stats-hero-top-tag")).toHaveTextContent("fantasy");
    expect(screen.getByTestId("stats-hero-avg-rating")).toHaveTextContent("4.5");
  });
});

describe("StatsClient — sparse ready state (FR-11)", () => {
  beforeEach(() => {
    __resetBookLibrary();
    localStorage.clear();
  });

  it("keeps the portrait visible with empty prompts when books have no ratings or tags", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Solo Want",
      author: "A",
      status: "want",
      tags: [],
    });

    render(<StatsClient />);
    expect(screen.getByTestId("stats-portrait")).toBeInTheDocument();
    expect(screen.getByTestId("stats-hero-prompt")).toBeInTheDocument();
    expect(
      screen.getByTestId("stats-favorite-tags-empty")
    ).toBeInTheDocument();
    expect(screen.getByTestId("stats-top-rated-empty")).toBeInTheDocument();
    expect(
      screen.getByTestId("stats-rhythm-pages")
    ).toHaveTextContent(/log pages as you read/i);
    expect(screen.getByTestId("stats-shelf-bar")).toBeInTheDocument();
  });

  it("replaces page-based facts with legacy-day prompts when only readingDays exist", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Legacy",
      author: "A",
      status: "reading",
      tags: ["essay"],
      readingDays: ["2026-06-14", "2026-06-15"],
    });

    render(<StatsClient />);
    const rhythm = screen.getByTestId("stats-rhythm");
    expect(
      within(rhythm).getByTestId("stats-rhythm-pages")
    ).toHaveTextContent(/page count appears here/i);
    expect(
      within(rhythm).getByTestId("stats-rhythm-best-day")
    ).toHaveTextContent(/page totals are hidden/i);
  });

  it("keeps the favorite-tag list visible when tags exist", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "read",
      tags: ["fantasy", "classic"],
      rating: 5,
    });
    await useBookLibrary.getState().addBook({
      title: "The Hobbit",
      author: "J. R. R. Tolkien",
      status: "read",
      tags: ["fantasy"],
      rating: 4,
    });

    render(<StatsClient />);
    const tags = screen.getByTestId("stats-favorite-tags");
    const items = within(tags).getAllByTestId("stats-favorite-tag");
    const labels = items.map((el) => el.getAttribute("data-tag-label"));
    expect(labels[0]).toBe("fantasy");
    expect(items[0]).toHaveAttribute("data-tag-count", "2");
  });

  it("keeps the top-rated list capped at five and ordered by rating desc", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    const titles = ["A", "B", "C", "D", "E", "F", "G"];
    const ratings: Array<1 | 2 | 3 | 4 | 5> = [5, 5, 4, 4, 3, 5, 2];
    for (let i = 0; i < titles.length; i++) {
      const rating = ratings[i] ?? 3;
      await useBookLibrary.getState().addBook({
        title: titles[i] ?? "X",
        author: "Author",
        status: "read",
        tags: [],
        rating,
      });
    }

    render(<StatsClient />);
    const items = within(screen.getByTestId("stats-top-rated")).getAllByTestId(
      "stats-top-rated-item"
    );
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveAttribute("data-book-rating", "5");
    expect(items[0]).toHaveAttribute("data-book-id");
  });
});
