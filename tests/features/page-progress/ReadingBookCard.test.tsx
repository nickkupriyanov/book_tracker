import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReadingBookCard } from "@/features/page-progress/ReadingBookCard";
import type { Book } from "@/types/book";

const baseBook: Book = {
  id: "b1",
  title: "Alpha",
  author: "Author A",
  status: "reading",
  tags: [],
  createdAt: "2026-06-01T00:00:00.000Z",
};

const baseLog = {
  id: "log-1",
  date: "2026-06-01",
  pagesRead: 42,
  currentPageAfter: 42,
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z",
};

describe("ReadingBookCard — sizing (spec 020 FR-8)", () => {
  it("does not set a fixed pixel width; it sizes from its parent", () => {
    render(<ReadingBookCard book={baseBook} active onSelect={() => {}} />);
    const card = screen.getByTestId("reading-book-card");
    const classes = card.getAttribute("class") ?? "";
    // The previous version set `w-[160px]`; that has been removed
    // (spec 020 FR-8) so the parent lane controls the column.
    expect(classes).not.toMatch(/\bw-\[160px\]/);
    // The card still declares full-width inside its column.
    expect(classes).toMatch(/\bw-full\b/);
  });

  it("renders progress from reading logs instead of stale currentPage", () => {
    render(
      <ReadingBookCard
        book={{
          ...baseBook,
          currentPage: 999,
          totalPages: 420,
          readingLogs: [baseLog],
        }}
        active
        onSelect={() => {}}
      />
    );

    expect(screen.getByText("42 / 420")).toBeInTheDocument();
  });
});
