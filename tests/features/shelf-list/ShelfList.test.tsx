import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShelfList } from "@/features/shelf-list/ShelfList";
import type { Book } from "@/types/book";

const bookWant: Book = {
  id: "1",
  title: "Book A",
  author: "Author A",
  status: "want",
  tags: [],
  createdAt: "2026-06-01T00:00:00.000Z",
};
const bookReading: Book = {
  id: "2",
  title: "Book B",
  author: "Author B",
  status: "reading",
  tags: [],
  createdAt: "2026-06-02T00:00:00.000Z",
};
const bookRead: Book = {
  id: "3",
  title: "Book C",
  author: "Author C",
  status: "read",
  tags: [],
  createdAt: "2026-06-03T00:00:00.000Z",
};
const sampleBooks: Book[] = [bookWant, bookReading, bookRead];

describe("ShelfList", () => {
  describe("default state", () => {
    it("renders all books when filter is 'all' (default)", () => {
      render(<ShelfList books={sampleBooks} />);
      expect(screen.getByText("Book A")).toBeInTheDocument();
      expect(screen.getByText("Book B")).toBeInTheDocument();
      expect(screen.getByText("Book C")).toBeInTheDocument();
    });

    it("renders counts in the filter tabs", () => {
      render(<ShelfList books={sampleBooks} />);
      expect(
        screen.getByRole("tab", { name: /All \(3\)/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Want to read \(1\)/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Reading \(1\)/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Read \(1\)/ })
      ).toBeInTheDocument();
    });
  });

  describe("filtering", () => {
    it("shows only 'want' books when Want tab is clicked", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={sampleBooks} />);
      await user.click(screen.getByRole("tab", { name: /Want to read/ }));
      expect(screen.getByText("Book A")).toBeInTheDocument();
      expect(screen.queryByText("Book B")).not.toBeInTheDocument();
      expect(screen.queryByText("Book C")).not.toBeInTheDocument();
    });

    it("shows only 'reading' books when Reading tab is clicked", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={sampleBooks} />);
      await user.click(screen.getByRole("tab", { name: /^Reading/ }));
      expect(screen.getByText("Book B")).toBeInTheDocument();
      expect(screen.queryByText("Book A")).not.toBeInTheDocument();
      expect(screen.queryByText("Book C")).not.toBeInTheDocument();
    });

    it("shows only 'read' books when Read tab is clicked", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={sampleBooks} />);
      await user.click(screen.getByRole("tab", { name: /^Read \(/ }));
      expect(screen.getByText("Book C")).toBeInTheDocument();
      expect(screen.queryByText("Book A")).not.toBeInTheDocument();
      expect(screen.queryByText("Book B")).not.toBeInTheDocument();
    });
  });

  describe("empty filter result", () => {
    it("shows 'No books with this status.' when filter matches no books", async () => {
      const user = userEvent.setup();
      const onlyWant: Book[] = [bookWant];
      render(<ShelfList books={onlyWant} />);
      await user.click(screen.getByRole("tab", { name: /^Reading/ }));
      expect(screen.queryByText("Book A")).not.toBeInTheDocument();
      expect(
        screen.getByText("No books with this status.")
      ).toBeInTheDocument();
    });
  });

  describe("reactivity", () => {
    it("recomputes counts when books prop changes", () => {
      const { rerender } = render(<ShelfList books={sampleBooks} />);
      expect(
        screen.getByRole("tab", { name: /All \(3\)/ })
      ).toBeInTheDocument();

      const newBook: Book = {
        id: "4",
        title: "Book D",
        author: "Author D",
        status: "want",
        tags: [],
        createdAt: "2026-06-04T00:00:00.000Z",
      };
      rerender(<ShelfList books={[...sampleBooks, newBook]} />);
      expect(
        screen.getByRole("tab", { name: /All \(4\)/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Want to read \(2\)/ })
      ).toBeInTheDocument();
    });

    it("does not show a newly added book if filter excludes its status", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<ShelfList books={sampleBooks} />);
      await user.click(screen.getByRole("tab", { name: /^Reading/ }));
      expect(screen.getByText("Book B")).toBeInTheDocument();

      const newBook: Book = {
        id: "4",
        title: "Book D",
        author: "Author D",
        status: "want",
        tags: [],
        createdAt: "2026-06-04T00:00:00.000Z",
      };
      rerender(<ShelfList books={[...sampleBooks, newBook]} />);
      expect(screen.getByText("Book B")).toBeInTheDocument();
      expect(screen.queryByText("Book D")).not.toBeInTheDocument();
    });
  });
});
