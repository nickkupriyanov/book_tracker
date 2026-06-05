import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuotesSection } from "@/features/quotes/QuotesSection";
import type { Book } from "@/types/book";
import type { Quote } from "@/types/quote";

function makeQuote(
  id: string,
  text: string,
  createdAt: string,
  extra: Partial<Quote> = {}
): Quote {
  return { id, text, createdAt, ...extra };
}

function makeBook(quotes: Quote[] | undefined): Book {
  return {
    id: "book-1",
    title: "Piranesi",
    author: "Susanna Clarke",
    status: "reading",
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...(quotes !== undefined ? { quotes } : {}),
  };
}

describe("QuotesSection", () => {
  it("renders DetailSection with title 'Quotes'", () => {
    render(
      <QuotesSection
        book={makeBook(undefined)}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Quotes" })
    ).toBeInTheDocument();
  });

  it("shows the empty state when book.quotes is undefined", () => {
    render(
      <QuotesSection
        book={makeBook(undefined)}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByTestId("quotes-empty")).toHaveTextContent(
      /no quotes yet/i
    );
    expect(screen.getByTestId("add-quote-button")).toBeInTheDocument();
    // No cards
    expect(screen.queryAllByTestId("quote-card")).toHaveLength(0);
  });

  it("shows the empty state when book.quotes is []", () => {
    render(
      <QuotesSection
        book={makeBook([])}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByTestId("quotes-empty")).toHaveTextContent(
      /no quotes yet/i
    );
    expect(screen.queryAllByTestId("quote-card")).toHaveLength(0);
  });

  it("renders one QuoteCard per quote", () => {
    const quotes = [
      makeQuote("q-1", "First quote.", "2026-06-01T00:00:00.000Z"),
      makeQuote("q-2", "Second quote.", "2026-06-02T00:00:00.000Z"),
      makeQuote("q-3", "Third quote.", "2026-06-03T00:00:00.000Z"),
    ];
    render(
      <QuotesSection
        book={makeBook(quotes)}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getAllByTestId("quote-card")).toHaveLength(3);
    // Empty state hidden
    expect(screen.queryByTestId("quotes-empty")).not.toBeInTheDocument();
  });

  it("sorts quotes by createdAt descending (newest first)", () => {
    // Insert in a non-sorted order to confirm the section re-sorts.
    const quotes = [
      makeQuote("q-mid", "Middle one.", "2026-06-02T00:00:00.000Z"),
      makeQuote("q-old", "Oldest one.", "2026-06-01T00:00:00.000Z"),
      makeQuote("q-new", "Newest one.", "2026-06-03T00:00:00.000Z"),
    ];
    render(
      <QuotesSection
        book={makeBook(quotes)}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const cards = screen.getAllByTestId("quote-card");
    expect(cards).toHaveLength(3);
    // Assert the rendered order of the text inside each card.
    expect(within(cards[0]!).getByTestId("quote-text")).toHaveTextContent(
      "Newest one."
    );
    expect(within(cards[1]!).getByTestId("quote-text")).toHaveTextContent(
      "Middle one."
    );
    expect(within(cards[2]!).getByTestId("quote-text")).toHaveTextContent(
      "Oldest one."
    );
  });

  it("clicking + Add quote calls onAdd", async () => {
    const onAdd = vi.fn();
    render(
      <QuotesSection
        book={makeBook([
          makeQuote("q-1", "A quote.", "2026-06-01T00:00:00.000Z"),
        ])}
        onAdd={onAdd}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId("add-quote-button"));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it("disables the + Add quote button at the 200-quote cap", () => {
    const quotes = Array.from({ length: 200 }, (_, i) =>
      makeQuote(`q-${i}`, `quote ${i}`, "2026-06-01T00:00:00.000Z")
    );
    render(
      <QuotesSection
        book={makeBook(quotes)}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const button = screen.getByTestId("add-quote-button");
    expect(button).toBeDisabled();
  });

  it("keeps the + Add quote button enabled below the cap", () => {
    const quotes = Array.from({ length: 199 }, (_, i) =>
      makeQuote(`q-${i}`, `quote ${i}`, "2026-06-01T00:00:00.000Z")
    );
    render(
      <QuotesSection
        book={makeBook(quotes)}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByTestId("add-quote-button")).not.toBeDisabled();
  });

  it("clicking a card's Edit button calls onEdit with that quote", async () => {
    const onEdit = vi.fn();
    const target = makeQuote("q-target", "Target text.", "2026-06-01T00:00:00.000Z");
    const other = makeQuote("q-other", "Other text.", "2026-06-02T00:00:00.000Z");
    render(
      <QuotesSection
        book={makeBook([target, other])}
        onAdd={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    );
    const user = userEvent.setup();
    // Find the card that contains the target text (the rendered <p>
    // wraps it in curly quotes, so we look for the underlying substring).
    const targetCard = screen
      .getAllByTestId("quote-card")
      .find((c) => c.textContent?.includes("Target text.")) as HTMLElement;
    await user.click(within(targetCard).getByTestId("quote-edit-button"));
    expect(onEdit).toHaveBeenCalledWith(target);
  });

  it("clicking a card's Delete button calls onDelete with that quote", async () => {
    const onDelete = vi.fn();
    const target = makeQuote("q-target", "Target text.", "2026-06-01T00:00:00.000Z");
    const other = makeQuote("q-other", "Other text.", "2026-06-02T00:00:00.000Z");
    render(
      <QuotesSection
        book={makeBook([target, other])}
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );
    const user = userEvent.setup();
    const otherCard = screen
      .getAllByTestId("quote-card")
      .find((c) => c.textContent?.includes("Other text.")) as HTMLElement;
    await user.click(within(otherCard).getByTestId("quote-delete-button"));
    expect(onDelete).toHaveBeenCalledWith(other);
  });
});
