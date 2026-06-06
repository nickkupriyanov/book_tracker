import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShelfTagFilter } from "@/features/shelf-list/ShelfTagFilter";

describe("ShelfTagFilter", () => {
  it("renders nothing when tags is empty", () => {
    const { container } = render(
      <ShelfTagFilter tags={[]} selected={[]} onToggle={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders one chip per tag with # prefix", () => {
    render(
      <ShelfTagFilter
        tags={["fantasy", "classic"]}
        selected={[]}
        onToggle={() => {}}
      />
    );
    expect(screen.getByTestId("shelf-tag-fantasy")).toHaveTextContent("#fantasy");
    expect(screen.getByTestId("shelf-tag-classic")).toHaveTextContent("#classic");
  });

  it("calls onToggle with the tag when a chip is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ShelfTagFilter
        tags={["fantasy", "classic"]}
        selected={[]}
        onToggle={onToggle}
      />
    );
    await user.click(screen.getByTestId("shelf-tag-fantasy"));
    expect(onToggle).toHaveBeenCalledWith("fantasy");
  });

  it("selected chips have aria-checked=true and secondary variant; unselected have aria-checked=false and outline", () => {
    render(
      <ShelfTagFilter
        tags={["fantasy", "classic"]}
        selected={["fantasy"]}
        onToggle={() => {}}
      />
    );
    const selectedChip = screen.getByTestId("shelf-tag-fantasy");
    const unselectedChip = screen.getByTestId("shelf-tag-classic");
    expect(selectedChip).toHaveAttribute("aria-checked", "true");
    expect(unselectedChip).toHaveAttribute("aria-checked", "false");
    expect(
      selectedChip.querySelector('[data-variant="secondary"]')
    ).toBeInTheDocument();
    expect(
      unselectedChip.querySelector('[data-variant="outline"]')
    ).toBeInTheDocument();
  });

  it("uses overflow-x-auto when tags.length > 20", () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    render(<ShelfTagFilter tags={tags} selected={[]} onToggle={() => {}} />);
    const wrapper = screen.getByTestId("shelf-tag-filter");
    expect(wrapper.className).toContain("overflow-x-auto");
    expect(wrapper.className).toContain("whitespace-nowrap");
  });

  it("uses flex flex-wrap when tags.length <= 20", () => {
    render(
      <ShelfTagFilter
        tags={["fantasy", "classic"]}
        selected={[]}
        onToggle={() => {}}
      />
    );
    const wrapper = screen.getByTestId("shelf-tag-filter");
    expect(wrapper.className).toContain("flex");
    expect(wrapper.className).toContain("flex-wrap");
    expect(wrapper.className).not.toContain("overflow-x-auto");
  });
});
