import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReaderProfileCard } from "@/features/reader-profile/ReaderProfileCard";

describe("ReaderProfileCard — bookmark contour placement (spec 020 FR-6)", () => {
  it("renders the bookmark contour inside the card bounds rather than hanging off the right edge", () => {
    render(<ReaderProfileCard books={[]} now={new Date(2026, 5, 15)} />);
    const card = screen.getByTestId("reader-profile-card");
    const svg = card.querySelector("svg");
    expect(svg).not.toBeNull();
    // The contour must be positioned with an explicit right
    // offset that pulls it inward (spec 020 FR-6). The previous
    // version used `-right-1` (negative offset off the edge);
    // we now use `right-3` so the contour sits tucked into the
    // card body.
    const classes = (svg as SVGElement).getAttribute("class") ?? "";
    expect(classes).toMatch(/\bright-3\b/);
    expect(classes).not.toMatch(/-right-1/);
  });
});
