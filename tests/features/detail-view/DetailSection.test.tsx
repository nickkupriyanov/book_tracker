import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailSection } from "@/features/detail-view/DetailSection";

describe("DetailSection", () => {
  it("renders the title as an h2 and the children below", () => {
    render(
      <DetailSection title="Rating">
        <p>Five stars.</p>
      </DetailSection>
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Rating" })
    ).toBeInTheDocument();
    expect(screen.getByText("Five stars.")).toBeInTheDocument();
  });
});
