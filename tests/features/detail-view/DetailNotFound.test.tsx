import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailNotFound } from "@/features/detail-view/DetailNotFound";

describe("DetailNotFound", () => {
  it("renders the not-found message and a back link to /", () => {
    render(<DetailNotFound />);
    expect(
      screen.getByRole("heading", { level: 2, name: /Book not found/ })
    ).toBeInTheDocument();
    const back = screen.getByRole("link", { name: "Back to shelf" });
    expect(back).toBeInTheDocument();
    expect(back).toHaveAttribute("href", "/");
  });
});
