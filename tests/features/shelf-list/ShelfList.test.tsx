import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
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

  describe("delete dialog wiring (spec 004)", () => {
    it("opens the delete dialog when a card's trash button is clicked", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={sampleBooks} />);
      // sampleBooks[0] is bookWant ("Book A") — its trash button is
      // the first one in the grid.
      const trashButtons = screen.getAllByTestId("book-card-delete");
      await user.click(trashButtons[0]!);
      await screen.findByRole("alertdialog");
      expect(
        screen.getByRole("heading", { name: /Delete "Book A"\?/ })
      ).toBeInTheDocument();
      // Scope to the dialog: "Author A" also appears on the card
      // behind the overlay, so a global text query matches both.
      const dialog = screen.getByRole("alertdialog");
      expect(within(dialog).getByText(/Author A/)).toBeInTheDocument();
    });

    it("uses precedence: clicking edit on a card while delete is open closes delete and opens edit", () => {
      // Uses fireEvent because the Radix dialog overlay sets
      // `pointer-events: none` on the body, which user.click (and a
      // real user) correctly respects. The precedence rule is
      // defensive — under normal use the user can't reach the
      // cards behind an open dialog — but we still want the click
      // handlers to be correct if both states are ever set in the
      // same render.
      render(<ShelfList books={sampleBooks} />);

      // Open delete on book[0] (Book A).
      fireEvent.click(screen.getAllByTestId("book-card-delete")[0]!);
      expect(
        screen.getByRole("heading", { name: /Delete "Book A"\?/ })
      ).toBeInTheDocument();

      // Click edit on book[1] (Book B). Precedence should close
      // the delete dialog and open the edit dialog.
      fireEvent.click(screen.getAllByTestId("book-card-edit")[1]!);

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Edit book" })
      ).toBeInTheDocument();
    });

    it("uses precedence: clicking trash on a card while edit is open closes edit and opens delete", () => {
      render(<ShelfList books={sampleBooks} />);

      // Open edit on book[0] (Book A).
      fireEvent.click(screen.getAllByTestId("book-card-edit")[0]!);
      expect(
        screen.getByRole("heading", { name: "Edit book" })
      ).toBeInTheDocument();

      // Click trash on book[1] (Book B). Precedence should close
      // the edit dialog and open the delete dialog.
      fireEvent.click(screen.getAllByTestId("book-card-delete")[1]!);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /Delete "Book B"\?/ })
      ).toBeInTheDocument();
    });
  });
});
