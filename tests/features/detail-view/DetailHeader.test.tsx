import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DetailHeader } from "@/features/detail-view/DetailHeader";

describe("DetailHeader", () => {
  it("renders a back link to /", () => {
    render(<DetailHeader onEdit={vi.fn()} onDelete={vi.fn()} />);
    const back = screen.getByRole("link", { name: /Back to shelf/ });
    expect(back).toBeInTheDocument();
    expect(back).toHaveAttribute("href", "/");
  });

  it("clicking edit invokes onEdit", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<DetailHeader onEdit={onEdit} onDelete={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Edit book" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("clicking delete invokes onDelete", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<DetailHeader onEdit={vi.fn()} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Delete book" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("renders both Edit and Delete buttons", () => {
    render(<DetailHeader onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Edit book" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete book" })
    ).toBeInTheDocument();
  });
});
