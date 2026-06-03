import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookCard } from "@/features/shelf-list/BookCard";
import type { Book } from "@/types/book";

const baseBook: Book = {
  id: "1",
  title: "Piranesi",
  author: "Susanna Clarke",
  status: "reading",
  tags: [],
  createdAt: "2026-06-02T00:00:00.000Z",
};

describe("BookCard", () => {
  describe("cover", () => {
    it("renders <img> when coverUrl is set", () => {
      render(
        <BookCard
          book={{ ...baseBook, coverUrl: "https://example.com/c.jpg" }}
        />
      );
      const img = screen.getByRole("img", { name: "Piranesi" });
      expect(img).toHaveAttribute("src", "https://example.com/c.jpg");
    });

    it("renders placeholder (no <img>) when coverUrl is missing", () => {
      render(<BookCard book={baseBook} />);
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("swaps to placeholder after <img> onError", () => {
      render(
        <BookCard
          book={{ ...baseBook, coverUrl: "https://broken.example.com/c.jpg" }}
        />
      );
      const img = screen.getByRole("img", { name: "Piranesi" });
      expect(img).toBeInTheDocument();
      fireEvent.error(img);
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  describe("title and author", () => {
    it("shows title and author", () => {
      render(<BookCard book={baseBook} />);
      expect(screen.getByText("Piranesi")).toBeInTheDocument();
      expect(screen.getByText("Susanna Clarke")).toBeInTheDocument();
    });

    it("truncates long title and author with the `truncate` class", () => {
      const longTitle = "a".repeat(200);
      const longAuthor = "b".repeat(200);
      render(
        <BookCard
          book={{ ...baseBook, title: longTitle, author: longAuthor }}
        />
      );
      const titleEl = screen.getByText(longTitle);
      const authorEl = screen.getByText(longAuthor);
      expect(titleEl.className).toMatch(/\btruncate\b/);
      expect(authorEl.className).toMatch(/\btruncate\b/);
    });
  });

  describe("status pill", () => {
    it.each([
      ["want", "Want to read"],
      ["reading", "Reading"],
      ["read", "Read"],
    ] as const)("renders %s status as '%s'", (status, label) => {
      render(<BookCard book={{ ...baseBook, status }} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it("renders a checkmark inside the 'read' pill (D1)", () => {
      render(<BookCard book={{ ...baseBook, status: "read" }} />);
      const readPill = screen.getByText("Read");
      expect(readPill.querySelector("svg")).toBeInTheDocument();
    });

    it("does not render a checkmark for 'want' or 'reading'", () => {
      const { rerender } = render(
        <BookCard book={{ ...baseBook, status: "want" }} />
      );
      expect(screen.getByText("Want to read").querySelector("svg")).toBeNull();
      rerender(<BookCard book={{ ...baseBook, status: "reading" }} />);
      expect(screen.getByText("Reading").querySelector("svg")).toBeNull();
    });
  });

  describe("tags", () => {
    it("renders all tags when count <= 3", () => {
      render(
        <BookCard
          book={{ ...baseBook, tags: ["fiction", "mystery"] }}
        />
      );
      expect(screen.getByText("fiction")).toBeInTheDocument();
      expect(screen.getByText("mystery")).toBeInTheDocument();
      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });

    it("shows +N overflow chip when more than 3 tags", () => {
      render(
        <BookCard
          book={{ ...baseBook, tags: ["a", "b", "c", "d", "e"] }}
        />
      );
      expect(screen.getByText("a")).toBeInTheDocument();
      expect(screen.getByText("b")).toBeInTheDocument();
      expect(screen.getByText("c")).toBeInTheDocument();
      expect(screen.getByText("+2")).toBeInTheDocument();
      expect(screen.queryByText("d")).not.toBeInTheDocument();
      expect(screen.queryByText("e")).not.toBeInTheDocument();
    });

    it("renders no tag chips when tags array is empty", () => {
      render(<BookCard book={{ ...baseBook, tags: [] }} />);
      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });

    it("shows exactly 3 tags with +1 when there are 4", () => {
      render(
        <BookCard
          book={{ ...baseBook, tags: ["a", "b", "c", "d"] }}
        />
      );
      expect(screen.getByText("+1")).toBeInTheDocument();
    });
  });

  describe("Edit button", () => {
    it("does not render a button when onEdit is not provided", () => {
      render(<BookCard book={baseBook} />);
      expect(
        screen.queryByTestId("book-card-edit")
      ).not.toBeInTheDocument();
    });

    it("renders a pencil button when onEdit is provided", () => {
      render(<BookCard book={baseBook} onEdit={vi.fn()} />);
      expect(screen.getByTestId("book-card-edit")).toBeInTheDocument();
      expect(screen.getByLabelText("Edit book")).toBeInTheDocument();
    });

    it("clicking the button invokes onEdit", async () => {
      const onEdit = vi.fn();
      const user = userEvent.setup();
      render(<BookCard book={baseBook} onEdit={onEdit} />);
      await user.click(screen.getByTestId("book-card-edit"));
      expect(onEdit).toHaveBeenCalledTimes(1);
    });
  });
});
