import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ReaderProfileCard } from "@/features/reader-profile/ReaderProfileCard";
import type { Book, ReadingLog } from "@/types/book";

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    title: "Piranesi",
    author: "Susanna Clarke",
    status: "reading",
    tags: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeLog(overrides: Partial<ReadingLog> = {}): ReadingLog {
  return {
    id: "log-1",
    date: "2026-06-10",
    pagesRead: 20,
    currentPageAfter: 20,
    createdAt: "2026-06-10T10:00:00.000Z",
    updatedAt: "2026-06-10T10:00:00.000Z",
    ...overrides,
  };
}

describe("ReaderProfileCard (spec 017)", () => {
  it("renders the 'Quiet Reader' nickname", () => {
    render(<ReaderProfileCard books={[]} now={new Date(2026, 5, 15)} />);
    expect(screen.getByText("Quiet Reader")).toBeInTheDocument();
  });

  it("renders the monogram avatar derived from the nickname", () => {
    render(<ReaderProfileCard books={[]} now={new Date(2026, 5, 15)} />);
    expect(screen.getByTestId("reader-profile-monogram")).toHaveTextContent(
      "QR"
    );
  });

  it("renders a single muted reader status line", () => {
    render(<ReaderProfileCard books={[]} now={new Date(2026, 5, 15)} />);
    expect(screen.getByTestId("reader-profile-status")).toBeInTheDocument();
  });

  it("renders the three stat labels: Read, Streak, Pages", () => {
    render(<ReaderProfileCard books={[]} now={new Date(2026, 5, 15)} />);
    const card = screen.getByTestId("reader-profile-card");
    expect(within(card).getByText("Read")).toBeInTheDocument();
    expect(within(card).getByText("Streak")).toBeInTheDocument();
    expect(within(card).getByText("Pages")).toBeInTheDocument();
  });

  it("shows calm zero values when the library has no read books or logs", () => {
    render(
      <ReaderProfileCard
        books={[makeBook({ id: "a", status: "want" })]}
        now={new Date(2026, 5, 15)}
      />
    );
    const read = screen.getByTestId("reader-profile-stat-read");
    const streak = screen.getByTestId("reader-profile-stat-streak");
    const pages = screen.getByTestId("reader-profile-stat-pages");
    expect(read).toHaveTextContent("0");
    expect(streak).toHaveTextContent("0");
    expect(pages).toHaveTextContent("0");
  });

  it("shows the live read count, streak, and page total from the library", () => {
    const books = [
      makeBook({ id: "a", status: "read" }),
      makeBook({ id: "b", status: "read" }),
      makeBook({
        id: "c",
        status: "reading",
        readingLogs: [
          makeLog({ id: "c1", date: "2026-06-14", pagesRead: 30 }),
          makeLog({ id: "c2", date: "2026-06-15", pagesRead: 40 }),
        ],
      }),
    ];
    render(<ReaderProfileCard books={books} now={new Date(2026, 5, 15)} />);
    expect(screen.getByTestId("reader-profile-stat-read")).toHaveTextContent(
      "2"
    );
    expect(screen.getByTestId("reader-profile-stat-streak")).toHaveTextContent(
      "2"
    );
    expect(screen.getByTestId("reader-profile-stat-pages")).toHaveTextContent(
      "70"
    );
  });
});
