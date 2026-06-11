import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
    expect(
      screen.getByRole("link", { name: /achievements/i })
    ).toHaveAttribute("href", "/achievements");
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

  it("marks the achievements route as active", () => {
    mockUsePathname.mockReturnValue("/achievements");
    render(<AppHeader />);
    expect(
      screen.getByRole("link", { name: /achievements/i })
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
    expect(
      screen.getByRole("link", { name: /achievements/i })
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

  describe("mobile navigation", () => {
    it("renders a hamburger toggle with the correct aria attributes", () => {
      mockUsePathname.mockReturnValue("/");
      render(<AppHeader />);
      const toggle = screen.getByTestId("header-nav-toggle");
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(toggle).toHaveAttribute("aria-controls");
      expect(toggle).toHaveAttribute("aria-label", "Open navigation");
    });

    it("clicking the hamburger reveals the mobile nav with all four links", async () => {
      const user = userEvent.setup();
      mockUsePathname.mockReturnValue("/library");
      render(<AppHeader />);
      // Mobile nav is hidden initially.
      expect(
        screen.queryByTestId("header-mobile-nav"),
      ).not.toBeInTheDocument();
      await user.click(screen.getByTestId("header-nav-toggle"));
      const mobileNav = screen.getByTestId("header-mobile-nav");
      // All four links are present, including the new
      // Achievements entry.
      const links = within(mobileNav).getAllByRole("link");
      expect(links.map((l) => l.textContent)).toEqual([
        "Home",
        "Library",
        "Statistics",
        "Achievements",
      ]);
      // Active route is marked in the mobile nav too.
      const active = links.find((l) =>
        l.hasAttribute("aria-current"),
      );
      expect(active).toBeDefined();
      expect(active?.textContent).toBe("Library");
      // Toggle is now in the open state.
      const toggle = screen.getByTestId("header-nav-toggle");
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(toggle).toHaveAttribute("aria-label", "Close navigation");
    });

    it("Escape closes the mobile nav", async () => {
      const user = userEvent.setup();
      mockUsePathname.mockReturnValue("/");
      render(<AppHeader />);
      await user.click(screen.getByTestId("header-nav-toggle"));
      expect(screen.getByTestId("header-mobile-nav")).toBeInTheDocument();
      await user.keyboard("{Escape}");
      expect(
        screen.queryByTestId("header-mobile-nav"),
      ).not.toBeInTheDocument();
    });

    it("a route change auto-closes the mobile nav", async () => {
      mockUsePathname.mockReturnValue("/");
      const user = userEvent.setup();
      const { rerender } = render(<AppHeader />);
      await user.click(screen.getByTestId("header-nav-toggle"));
      expect(screen.getByTestId("header-mobile-nav")).toBeInTheDocument();
      // Simulate a route change: pathname updates and the
      // component re-renders. The useEffect on `pathname`
      // closes the panel.
      mockUsePathname.mockReturnValue("/library");
      rerender(<AppHeader />);
      expect(
        screen.queryByTestId("header-mobile-nav"),
      ).not.toBeInTheDocument();
    });
  });
});
