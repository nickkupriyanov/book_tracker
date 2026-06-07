import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppHeader } from "@/components/AppHeader";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: (...args: unknown[]) => mockUsePathname(...args),
}));

describe("AppHeader", () => {
  it("renders the app title as a link to /", () => {
    mockUsePathname.mockReturnValue("/");
    render(<AppHeader />);
    const title = screen.getByRole("link", { name: /book tracker/i });
    expect(title).toBeInTheDocument();
    expect(title).toHaveAttribute("href", "/");
  });

  it("renders navigation links to each route", () => {
    mockUsePathname.mockReturnValue("/");
    render(<AppHeader />);
    expect(screen.getByRole("link", { name: /главная/i })).toHaveAttribute(
      "href",
      "/"
    );
    expect(
      screen.getByRole("link", { name: /библиотека/i })
    ).toHaveAttribute("href", "/library");
    expect(
      screen.getByRole("link", { name: /статистика/i })
    ).toHaveAttribute("href", "/stats");
  });

  it("marks the home route as active with aria-current=page", () => {
    mockUsePathname.mockReturnValue("/");
    render(<AppHeader />);
    expect(
      screen.getByRole("link", { name: /главная/i })
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks the library route as active", () => {
    mockUsePathname.mockReturnValue("/library");
    render(<AppHeader />);
    expect(
      screen.getByRole("link", { name: /библиотека/i })
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks the stats route as active", () => {
    mockUsePathname.mockReturnValue("/stats");
    render(<AppHeader />);
    expect(
      screen.getByRole("link", { name: /статистика/i })
    ).toHaveAttribute("aria-current", "page");
  });

  it("does not mark non-active links with aria-current", () => {
    mockUsePathname.mockReturnValue("/");
    render(<AppHeader />);
    expect(
      screen.getByRole("link", { name: /библиотека/i })
    ).not.toHaveAttribute("aria-current");
    expect(
      screen.getByRole("link", { name: /статистика/i })
    ).not.toHaveAttribute("aria-current");
  });
});
