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

  describe("Delete button", () => {
    it("does not render a button when onDelete is not provided", () => {
      render(<BookCard book={baseBook} onEdit={vi.fn()} />);
      expect(
        screen.queryByTestId("book-card-delete")
      ).not.toBeInTheDocument();
    });

    it("renders a trash button when onDelete is provided", () => {
      render(<BookCard book={baseBook} onDelete={vi.fn()} />);
      expect(screen.getByTestId("book-card-delete")).toBeInTheDocument();
      expect(screen.getByLabelText("Delete book")).toBeInTheDocument();
    });

    it("clicking the button invokes onDelete", async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<BookCard book={baseBook} onDelete={onDelete} />);
      await user.click(screen.getByTestId("book-card-delete"));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("renders both buttons side by side when onEdit and onDelete are provided", () => {
      render(
        <BookCard
          book={baseBook}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );
      expect(screen.getByTestId("book-card-edit")).toBeInTheDocument();
      expect(screen.getByTestId("book-card-delete")).toBeInTheDocument();
    });
  });

  describe("Title link to detail page (spec 005)", () => {
    it("wraps the title in a Link to /book/<id>", () => {
      render(<BookCard book={baseBook} />);
      const link = screen.getByRole("link", { name: "Piranesi" });
      expect(link).toHaveAttribute("href", "/book/1");
    });

    it("only the title is a link (cover, tags, body are not)", () => {
      render(
        <BookCard
          book={baseBook}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );
      // Exactly one link on the card: the title.
      expect(screen.getAllByRole("link")).toHaveLength(1);
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/book/1"
      );
    });
  });

  describe("page progress (spec 015)", () => {
    it("does not render progress text when neither currentPage nor totalPages is set", () => {
      render(<BookCard book={baseBook} />);
      expect(
        screen.queryByTestId("book-card-progress")
      ).not.toBeInTheDocument();
    });

    it("renders 'Page N' when only currentPage is set", () => {
      render(<BookCard book={{ ...baseBook, currentPage: 42 }} />);
      expect(screen.getByTestId("book-card-progress")).toHaveTextContent(
        "Page 42"
      );
    });

    it("renders 'N / M pages' when both currentPage and totalPages are set", () => {
      render(
        <BookCard
          book={{ ...baseBook, currentPage: 123, totalPages: 420 }}
        />
      );
      expect(screen.getByTestId("book-card-progress")).toHaveTextContent(
        "123 / 420 pages"
      );
    });

    it("does not render progress text when only totalPages is set (no currentPage)", () => {
      render(<BookCard book={{ ...baseBook, totalPages: 420 }} />);
      expect(
        screen.queryByTestId("book-card-progress")
      ).not.toBeInTheDocument();
    });
  });

  describe("soft shell (spec 020 §5.5 / FR-15)", () => {
    it("does not use the default harsh card border or shadow", () => {
      const { container } = render(<BookCard book={baseBook} />);
      const card = container.querySelector('[data-slot="card"]');
      expect(card).not.toBeNull();
      const classes = card!.getAttribute("class") ?? "";
      // The shadcn Card defaults to `border` (no opacity modifier)
      // and `shadow-sm`; spec 020 FR-15 wants a softer shell.
      // We override both via the BookCard.
      expect(classes).toMatch(/\bborder-border\/70\b/);
      expect(classes).toMatch(/\bshadow-none\b/);
      // And we drop the Card's default py-6 (6 * 0.25rem = 1.5rem)
      // so the cover sits flush at the top of the card.
      expect(classes).not.toMatch(/\bpy-6\b/);
    });

    it("keeps the cover rounded at the top of the compact card", () => {
      const { container } = render(<BookCard book={baseBook} />);
      const cover = container.querySelector('[data-slot="card"] > div');
      expect(cover).not.toBeNull();
      expect(cover).toHaveClass("rounded-t-lg");
    });

    it("renders the delete action on a readable surface over dark covers", () => {
      render(
        <BookCard
          book={{ ...baseBook, coverUrl: "https://example.com/black.jpg" }}
          onDelete={() => {}}
        />
      );
      const button = screen.getByTestId("book-card-delete");
      expect(button).toHaveAttribute("data-variant", "secondary");
      expect(button).toHaveClass("bg-background/90");
      expect(button).toHaveClass("shadow-sm");
      expect(button).toHaveClass("hover:text-destructive");
    });
  });
});
