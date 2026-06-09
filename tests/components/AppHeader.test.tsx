import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppHeader } from "@/components/AppHeader";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: (...args: unknown[]) => mockUsePathname(...args),
}));

describe("AppHeader", () => {
  beforeEach(async () => {
    __resetBookLibrary();
    localStorage.clear();
  });

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
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute(
      "href",
      "/"
    );
    expect(
      screen.getByRole("link", { name: /library/i })
    ).toHaveAttribute("href", "/library");
    expect(
      screen.getByRole("link", { name: /statistics/i })
    ).toHaveAttribute("href", "/stats");
  });

  it("marks the home route as active with aria-current=page", () => {
    mockUsePathname.mockReturnValue("/");
    render(<AppHeader />);
    expect(
      screen.getByRole("link", { name: /home/i })
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks the library route as active", () => {
    mockUsePathname.mockReturnValue("/library");
    render(<AppHeader />);
    expect(
      screen.getByRole("link", { name: /library/i })
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks the stats route as active", () => {
    mockUsePathname.mockReturnValue("/stats");
    render(<AppHeader />);
    expect(
      screen.getByRole("link", { name: /statistics/i })
    ).toHaveAttribute("aria-current", "page");
  });

  it("does not mark non-active links with aria-current", () => {
    mockUsePathname.mockReturnValue("/");
    render(<AppHeader />);
    expect(
      screen.getByRole("link", { name: /library/i })
    ).not.toHaveAttribute("aria-current");
    expect(
      screen.getByRole("link", { name: /statistics/i })
    ).not.toHaveAttribute("aria-current");
  });

  it("renders a right-aligned 'Add book' button", () => {
    mockUsePathname.mockReturnValue("/");
    const { container } = render(<AppHeader />);
    const headerInner = container.querySelector("header > div");
    expect(headerInner).not.toBeNull();
    expect(headerInner).toHaveClass("flex-wrap");
    expect(headerInner).toHaveClass("sm:flex-nowrap");
    const button = screen.getByTestId("header-add-book");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Add book");
    expect(button).toHaveClass("w-full");
    expect(button).toHaveClass("sm:w-auto");
  });

  it("disables the add-book button while the store is loading", () => {
    mockUsePathname.mockReturnValue("/");
    render(<AppHeader />);
    const button = screen.getByTestId("header-add-book");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-state", "loading");
  });

  it("disables the add-book button while the store is in the error state", () => {
    mockUsePathname.mockReturnValue("/");
    useBookLibrary.setState({ status: "error" });
    render(<AppHeader />);
    const button = screen.getByTestId("header-add-book");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-state", "loading");
  });

  it("enables the add-book button once the store is ready", async () => {
    mockUsePathname.mockReturnValue("/");
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    render(<AppHeader />);
    const button = screen.getByTestId("header-add-book");
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
    expect(button).toHaveAttribute("data-state", "ready");
  });

  it("opens the add-book dialog when the ready header button is clicked", async () => {
    const user = userEvent.setup();
    mockUsePathname.mockReturnValue("/");
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    render(<AppHeader />);
    const button = screen.getByTestId("header-add-book");
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
    await user.click(button);
    expect(
      await screen.findByRole("heading", { name: /add a book/i })
    ).toBeInTheDocument();
  });
});
