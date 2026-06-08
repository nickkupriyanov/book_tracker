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
    it("shows 'No books match your filters.' when filter matches no books", async () => {
      const user = userEvent.setup();
      const onlyWant: Book[] = [bookWant];
      render(<ShelfList books={onlyWant} />);
      await user.click(screen.getByRole("tab", { name: /^Reading/ }));
      expect(screen.queryByText("Book A")).not.toBeInTheDocument();
      expect(
        screen.getByText("No books match your filters.")
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
      // The default sort is "recently-added" (createdAt desc), so
      // the first card in the grid is bookRead ("Book C"), not the
      // first element of `sampleBooks`. We click the first trash
      // button and assert on whichever book that turns out to be.
      const trashButtons = screen.getAllByTestId("book-card-delete");
      await user.click(trashButtons[0]!);
      await screen.findByRole("alertdialog");
      expect(
        screen.getByRole("heading", { name: /Delete "Book C"\?/ })
      ).toBeInTheDocument();
      // Scope to the dialog: "Author C" also appears on the card
      // behind the overlay, so a global text query matches both.
      const dialog = screen.getByRole("alertdialog");
      expect(within(dialog).getByText(/Author C/)).toBeInTheDocument();
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

      // Open delete on grid[0] (Book C, the first card under
      // default "recently-added" sort).
      fireEvent.click(screen.getAllByTestId("book-card-delete")[0]!);
      expect(
        screen.getByRole("heading", { name: /Delete "Book C"\?/ })
      ).toBeInTheDocument();

      // Click edit on grid[1] (Book B). Precedence should close
      // the delete dialog and open the edit dialog.
      fireEvent.click(screen.getAllByTestId("book-card-edit")[1]!);

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Edit book" })
      ).toBeInTheDocument();
    });

    it("uses precedence: clicking trash on a card while edit is open closes edit and opens delete", () => {
      render(<ShelfList books={sampleBooks} />);

      // Open edit on grid[0] (Book C).
      fireEvent.click(screen.getAllByTestId("book-card-edit")[0]!);
      expect(
        screen.getByRole("heading", { name: "Edit book" })
      ).toBeInTheDocument();

      // Click trash on grid[1] (Book B). Precedence should close
      // the edit dialog and open the delete dialog.
      fireEvent.click(screen.getAllByTestId("book-card-delete")[1]!);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /Delete "Book B"\?/ })
      ).toBeInTheDocument();
    });
  });

  describe("search (spec 010)", () => {
    const taggedBooks: Book[] = [
      {
        id: "t1",
        title: "The Lord of the Rings",
        author: "Tolkien",
        status: "read",
        tags: ["fantasy"],
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "t2",
        title: "Programming Pearls",
        author: "Bentley",
        status: "want",
        tags: ["programming"],
        createdAt: "2026-06-02T00:00:00.000Z",
      },
      {
        id: "t3",
        title: "Clean Code",
        author: "Martin",
        status: "reading",
        tags: ["programming"],
        createdAt: "2026-06-03T00:00:00.000Z",
      },
    ];

    it("renders the search input", () => {
      render(<ShelfList books={sampleBooks} />);
      expect(screen.getByTestId("shelf-search")).toBeInTheDocument();
    });

    it("typing in the search input narrows the grid (case-insensitive, matches title/author/tag)", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={taggedBooks} />);
      expect(screen.getByText("The Lord of the Rings")).toBeInTheDocument();
      expect(screen.getByText("Programming Pearls")).toBeInTheDocument();
      expect(screen.getByText("Clean Code")).toBeInTheDocument();

      await user.type(screen.getByTestId("shelf-search"), "tolkien");

      expect(screen.getByText("The Lord of the Rings")).toBeInTheDocument();
      expect(screen.queryByText("Programming Pearls")).not.toBeInTheDocument();
      expect(screen.queryByText("Clean Code")).not.toBeInTheDocument();
    });
  });

  describe("tag filter (spec 010)", () => {
    const taggedBooks: Book[] = [
      {
        id: "t1",
        title: "The Lord of the Rings",
        author: "Tolkien",
        status: "read",
        tags: ["fantasy"],
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "t2",
        title: "Programming Pearls",
        author: "Bentley",
        status: "want",
        tags: ["programming"],
        createdAt: "2026-06-02T00:00:00.000Z",
      },
      {
        id: "t3",
        title: "Clean Code",
        author: "Martin",
        status: "reading",
        tags: ["programming"],
        createdAt: "2026-06-03T00:00:00.000Z",
      },
    ];

    it("clicking a tag chip narrows the grid", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={taggedBooks} />);
      expect(screen.getByText("The Lord of the Rings")).toBeInTheDocument();
      expect(screen.getByText("Programming Pearls")).toBeInTheDocument();

      await user.click(screen.getByTestId("shelf-tag-fantasy"));

      expect(screen.getByText("The Lord of the Rings")).toBeInTheDocument();
      expect(screen.queryByText("Programming Pearls")).not.toBeInTheDocument();
      expect(screen.queryByText("Clean Code")).not.toBeInTheDocument();
    });
  });

  describe("combined filters (spec 010)", () => {
    const taggedBooks: Book[] = [
      {
        id: "c1",
        title: "The Lord of the Rings",
        author: "Tolkien",
        status: "read",
        tags: ["fantasy"],
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "c2",
        title: "Programming Pearls",
        author: "Bentley",
        status: "want",
        tags: ["programming"],
        createdAt: "2026-06-02T00:00:00.000Z",
      },
      {
        id: "c3",
        title: "Clean Code",
        author: "Martin",
        status: "reading",
        tags: ["programming"],
        createdAt: "2026-06-03T00:00:00.000Z",
      },
    ];

    it("AND-combines search, tags, and status", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={taggedBooks} />);

      // Click "Reading" status tab — only Clean Code (programming) survives.
      await user.click(screen.getByRole("tab", { name: /^Reading/ }));
      expect(screen.getByText("Clean Code")).toBeInTheDocument();
      expect(screen.queryByText("The Lord of the Rings")).not.toBeInTheDocument();
      expect(screen.queryByText("Programming Pearls")).not.toBeInTheDocument();

      // Now click the "programming" tag chip — Clean Code still matches.
      await user.click(screen.getByTestId("shelf-tag-programming"));
      expect(screen.getByText("Clean Code")).toBeInTheDocument();

      // Now type "knuth" — no books match → empty result.
      await user.type(screen.getByTestId("shelf-search"), "knuth");
      expect(screen.queryByText("Clean Code")).not.toBeInTheDocument();
      expect(
        screen.getByText("No books match your filters.")
      ).toBeInTheDocument();
    });
  });

  describe("filter-aware tab counts (spec 011)", () => {
    const taggedBooks: Book[] = [
      {
        id: "c1",
        title: "The Lord of the Rings",
        author: "Tolkien",
        status: "read",
        tags: ["fantasy"],
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "c2",
        title: "Programming Pearls",
        author: "Bentley",
        status: "want",
        tags: ["programming"],
        createdAt: "2026-06-02T00:00:00.000Z",
      },
      {
        id: "c3",
        title: "Clean Code",
        author: "Martin",
        status: "reading",
        tags: ["programming"],
        createdAt: "2026-06-03T00:00:00.000Z",
      },
    ];

    it("with a search active, tab counts reflect search applied to each tab", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={taggedBooks} />);
      await user.type(screen.getByTestId("shelf-search"), "programming");
      // "programming" matches: Programming Pearls (want) + Clean Code (reading).
      expect(screen.getByRole("tab", { name: /All \(2\)/ })).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Want to read \(1\)/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Reading \(1\)/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Read \(0\)/ })
      ).toBeInTheDocument();
    });

    it("with tags selected, tab counts reflect tag filter applied to each tab", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={taggedBooks} />);
      // "programming" tag → 2 books (want, reading).
      await user.click(screen.getByTestId("shelf-tag-programming"));
      expect(screen.getByRole("tab", { name: /All \(2\)/ })).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Want to read \(1\)/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Reading \(1\)/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Read \(0\)/ })
      ).toBeInTheDocument();
    });

    it("with search AND tags active, tab counts are the AND of all three", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={taggedBooks} />);
      await user.click(screen.getByTestId("shelf-tag-fantasy"));
      // fantasy tag → 1 book (read: The Lord of the Rings).
      await user.type(screen.getByTestId("shelf-search"), "lord");
      expect(screen.getByRole("tab", { name: /All \(1\)/ })).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Read \(1\)/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Want to read \(0\)/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: /Reading \(0\)/ })
      ).toBeInTheDocument();
    });
  });

  describe("sorting (spec 012)", () => {
    const unsortedBooks: Book[] = [
      {
        id: "s1",
        title: "Charlie",
        author: "Wright",
        status: "want",
        tags: [],
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "s2",
        title: "Alpha",
        author: "Adams",
        status: "read",
        tags: [],
        createdAt: "2026-06-03T00:00:00.000Z",
        startedAt: "2026-05-15",
        finishedAt: "2026-05-20",
        rating: 5,
      },
      {
        id: "s3",
        title: "Bravo",
        author: "Brown",
        status: "reading",
        tags: [],
        createdAt: "2026-06-02T00:00:00.000Z",
        startedAt: "2026-05-28",
      },
    ];

    const gridTitles = (): string[] =>
      screen
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent ?? "");

    it("default sort is 'recently-added' — books appear in createdAt desc order", () => {
      render(<ShelfList books={unsortedBooks} />);
      expect(gridTitles()).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("selecting 'title-az' reorders the grid alphabetically by title", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={unsortedBooks} />);
      await user.click(screen.getByTestId("shelf-sort"));
      await user.click(screen.getByRole("option", { name: "Title (A→Z)" }));
      expect(gridTitles()).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("selecting 'recently-started' puts books with startedAt first (newest first) and nulls last", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={unsortedBooks} />);
      await user.click(screen.getByTestId("shelf-sort"));
      await user.click(
        screen.getByRole("option", { name: "Recently started" })
      );
      // Bravo has startedAt 2026-05-28, Alpha has 2026-05-15,
      // Charlie has no startedAt → last.
      expect(gridTitles()).toEqual(["Bravo", "Alpha", "Charlie"]);
    });

    it("changing the sort does not reset search, tag, or status state (and vice versa)", async () => {
      const user = userEvent.setup();
      // Setup: two "read fiction" books (Alpha, Bravo) + a
      // "want fiction" distractor (Charlie) + a "read non-fiction"
      // distractor (Delta). Search "a" + tag "fiction" + status
      // "read" leaves Alpha and Bravo. Default sort puts Bravo
      // first (later createdAt); title-az flips it to Alpha first.
      const taggedBooks: Book[] = [
        {
          id: "x1",
          title: "Charlie",
          author: "Wright",
          status: "want",
          tags: ["fiction"],
          createdAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "x2",
          title: "Alpha",
          author: "Adams",
          status: "read",
          tags: ["fiction"],
          createdAt: "2026-06-02T00:00:00.000Z",
        },
        {
          id: "x3",
          title: "Bravo",
          author: "Brown",
          status: "read",
          tags: ["fiction"],
          createdAt: "2026-06-03T00:00:00.000Z",
        },
        {
          id: "x4",
          title: "Delta",
          author: "Davis",
          status: "read",
          tags: ["non-fiction"],
          createdAt: "2026-06-04T00:00:00.000Z",
        },
      ];
      render(<ShelfList books={taggedBooks} />);

      // Set search, tag, and status.
      await user.type(screen.getByTestId("shelf-search"), "a");
      await user.click(screen.getByTestId("shelf-tag-fiction"));
      await user.click(screen.getByRole("tab", { name: /^Read \(/ }));

      // Sanity: only Alpha and Bravo survive (and they're in
      // createdAt desc: Bravo, Alpha).
      expect(gridTitles()).toEqual(["Bravo", "Alpha"]);

      // Now change sort to "title-az" — order flips to A, B.
      await user.click(screen.getByTestId("shelf-sort"));
      await user.click(screen.getByRole("option", { name: "Title (A→Z)" }));

      // Sort changed.
      expect(gridTitles()).toEqual(["Alpha", "Bravo"]);

      // Search preserved.
      expect(screen.getByTestId("shelf-search")).toHaveValue("a");
      // Tag chip still in the DOM.
      expect(screen.getByTestId("shelf-tag-fiction")).toBeInTheDocument();
      // Status tab still active.
      expect(
        screen.getByRole("tab", { name: /^Read \(/ })
      ).toHaveAttribute("data-state", "active");
    });
  });

  describe("Clear filters (spec 011)", () => {
    it("the Clear filters button is not in the DOM when no filter is active", () => {
      render(<ShelfList books={sampleBooks} />);
      expect(
        screen.queryByTestId("shelf-clear-filters")
      ).not.toBeInTheDocument();
    });

    it("the Clear filters button appears when search is non-empty and clears all dimensions on click", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={sampleBooks} />);

      await user.type(screen.getByTestId("shelf-search"), "Book A");
      expect(
        screen.getByTestId("shelf-clear-filters")
      ).toBeInTheDocument();

      await user.click(screen.getByTestId("shelf-clear-filters"));

      // Search input is now empty.
      expect(screen.getByTestId("shelf-search")).toHaveValue("");
      // All books visible again.
      expect(screen.getByText("Book A")).toBeInTheDocument();
      expect(screen.getByText("Book B")).toBeInTheDocument();
      expect(screen.getByText("Book C")).toBeInTheDocument();
      // Button is gone (no filter is active).
      expect(
        screen.queryByTestId("shelf-clear-filters")
      ).not.toBeInTheDocument();
    });

    it("after clicking Clear filters, focus is on the search input", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={sampleBooks} />);

      await user.type(screen.getByTestId("shelf-search"), "Book");
      const searchInput = screen.getByTestId("shelf-search");
      searchInput.blur();
      expect(searchInput).not.toHaveFocus();

      await user.click(screen.getByTestId("shelf-clear-filters"));
      expect(searchInput).toHaveFocus();
    });
  });

  describe("cohesive filter block (spec 020 §5.4 / FR-13)", () => {
    it("renders search, status, sort, and tag filter inside one block", () => {
      const taggedBooks: Book[] = [
        {
          id: "f1",
          title: "Tagged Book",
          author: "Author",
          status: "reading",
          tags: ["fiction"],
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ];
      render(<ShelfList books={taggedBooks} />);
      const block = screen.getByTestId("shelf-filter-block");
      expect(
        within(block).getByTestId("shelf-search")
      ).toBeInTheDocument();
      expect(
        within(block).getByRole("tab", { name: /^All \(/ })
      ).toBeInTheDocument();
      expect(within(block).getByTestId("shelf-sort")).toBeInTheDocument();
      expect(
        within(block).getByTestId("shelf-tag-fiction")
      ).toBeInTheDocument();
    });

    it("the clear-filters button lives inside the block, not in its own row", async () => {
      const user = userEvent.setup();
      render(<ShelfList books={sampleBooks} />);
      await user.type(screen.getByTestId("shelf-search"), "Book A");
      const block = screen.getByTestId("shelf-filter-block");
      // The button is a child of the cohesive block, not a
      // sibling (spec 020 FR-13).
      expect(
        within(block).getByTestId("shelf-clear-filters")
      ).toBeInTheDocument();
    });

    it("omits the tag-filter area when the library has no tags", () => {
      render(<ShelfList books={sampleBooks} />);
      const block = screen.getByTestId("shelf-filter-block");
      expect(
        within(block).queryByTestId("shelf-tag-filter")
      ).not.toBeInTheDocument();
    });
  });
});
