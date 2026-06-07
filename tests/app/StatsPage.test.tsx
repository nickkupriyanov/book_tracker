import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/stats/page";

describe("StatsPage placeholder", () => {
  it("renders a heading", () => {
    render(<Page />);
    expect(
      screen.getByRole("heading", { name: /statistics/i })
    ).toBeInTheDocument();
  });

  it("renders the placeholder message", () => {
    render(<Page />);
    expect(
      screen.getByText(/reading statistics will live here/i)
    ).toBeInTheDocument();
  });

  it("renders inside the shared page container", () => {
    render(<Page />);
    expect(screen.getByTestId("page-container")).toBeInTheDocument();
  });
});
