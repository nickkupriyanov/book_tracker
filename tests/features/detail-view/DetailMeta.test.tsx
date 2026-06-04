import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailMeta } from "@/features/detail-view/DetailMeta";
import type { Book } from "@/types/book";

const baseBook: Book = {
  id: "1",
  title: "Piranesi",
  author: "Susanna Clarke",
  status: "reading",
  tags: ["fiction", "fantasy", "house"],
  createdAt: "2026-06-01T12:00:00.000Z",
};

describe("DetailMeta", () => {
  it("renders title, author, status, all tags, and the added-on date", () => {
    render(<DetailMeta book={baseBook} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Piranesi" })
    ).toBeInTheDocument();
    expect(screen.getByText("Susanna Clarke")).toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
    for (const tag of baseBook.tags) {
      expect(screen.getByText(tag)).toBeInTheDocument();
    }
    // Date format is en-GB long; compute the expected value
    // dynamically so the test is timezone-agnostic.
    const expectedDate = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long",
    }).format(new Date(baseBook.createdAt));
    expect(
      screen.getByText(`Added on ${expectedDate}`)
    ).toBeInTheDocument();
  });

  it("renders a placeholder (no <img>) when coverUrl is missing", () => {
    render(<DetailMeta book={{ ...baseBook, coverUrl: undefined }} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the <img> when coverUrl is set", () => {
    render(
      <DetailMeta
        book={{ ...baseBook, coverUrl: "https://example.com/cover.jpg" }}
      />
    );
    const img = screen.getByRole("img", { name: "Piranesi" });
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  it("shows all tags without truncation when there are more than 3", () => {
    const manyTags = [
      "fiction",
      "fantasy",
      "house",
      "labyrinth",
      "ocean",
      "statues",
      "mystery",
      "favourite",
    ];
    render(<DetailMeta book={{ ...baseBook, tags: manyTags }} />);
    for (const tag of manyTags) {
      expect(screen.getByText(tag)).toBeInTheDocument();
    }
    // No "+N" overflow chip (the detail view never truncates).
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it("formats the date in en-GB long style", () => {
    render(
      <DetailMeta
        book={{ ...baseBook, createdAt: "2026-06-01T12:00:00.000Z" }}
      />
    );
    const expected = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long",
    }).format(new Date("2026-06-01T12:00:00.000Z"));
    // en-GB long format is e.g. "1 June 2026" or "31 May 2026"
    // depending on timezone — we just assert the structure
    // (day, month name, year).
    expect(screen.getByText(`Added on ${expected}`)).toBeInTheDocument();
    expect(expected).toMatch(/\d+ \w+ \d{4}/);
  });
});
