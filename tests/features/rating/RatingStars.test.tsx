import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RatingStars } from "@/features/rating/RatingStars";

describe("RatingStars", () => {
  it("renders 5 stars; fills stars 1..value and leaves the rest empty", () => {
    render(<RatingStars value={3} onChange={vi.fn()} />);
    // Stars 1..3 should have fill-current (solid).
    for (const n of [1, 2, 3]) {
      const icon = screen.getByTestId(`rating-star-${n}`).querySelector("svg");
      expect(icon).toHaveClass("fill-current");
    }
    // Stars 4..5 should have fill-none (empty).
    for (const n of [4, 5]) {
      const icon = screen.getByTestId(`rating-star-${n}`).querySelector("svg");
      expect(icon).toHaveClass("fill-none");
    }
  });

  it("renders 5 empty stars when value is undefined", () => {
    render(<RatingStars onChange={vi.fn()} />);
    for (const n of [1, 2, 3, 4, 5]) {
      const icon = screen.getByTestId(`rating-star-${n}`).querySelector("svg");
      expect(icon).toHaveClass("fill-none");
    }
  });

  it("clicking a star invokes onChange with the right number", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RatingStars value={3} onChange={onChange} />);
    await user.click(screen.getByTestId("rating-star-4"));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("makes all stars non-interactive when disabled", () => {
    render(<RatingStars value={3} onChange={vi.fn()} disabled={true} />);
    for (const n of [1, 2, 3, 4, 5]) {
      expect(screen.getByTestId(`rating-star-${n}`)).toBeDisabled();
    }
  });

  it("uses the right aria-label per star", () => {
    render(<RatingStars value={2} onChange={vi.fn()} />);
    expect(
      screen.getByTestId("rating-star-1").getAttribute("aria-label")
    ).toBe("Rate 1 star");
    expect(
      screen.getByTestId("rating-star-5").getAttribute("aria-label")
    ).toBe("Rate 5 stars");
  });
});
