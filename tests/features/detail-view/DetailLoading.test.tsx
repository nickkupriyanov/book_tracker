import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailLoading } from "@/features/detail-view/DetailLoading";

describe("DetailLoading", () => {
  it("renders the loading message", () => {
    render(<DetailLoading />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });
});
