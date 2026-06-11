import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AchievementsPage from "@/app/achievements/page";
import {
  __resetAchievements,
  useAchievements,
} from "@/state/achievements";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/achievements",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  __resetAchievements();
});

describe("/achievements page", () => {
  it("wraps the achievements content in the shared PageContainer rhythm", () => {
    useAchievements.setState({ status: "ready", unlocks: [] });
    render(<AchievementsPage />);
    // PageContainer exposes `data-testid="page-container"` and
    // is the visual parent on every other surface. Achievements
    // must inherit the same width so the page does not look
    // narrower than home / library / stats on desktop.
    const pageContainer = screen.getByTestId("page-container");
    expect(pageContainer).toBeInTheDocument();
    // AchievementsClient still renders its own inner wrapper
    // so existing selectors (state, sections) keep working.
    expect(screen.getByTestId("achievements-page")).toBeInTheDocument();
  });

  it("does not constrain the inner content to a narrower max-width than the page container", () => {
    useAchievements.setState({ status: "ready", unlocks: [] });
    render(<AchievementsPage />);
    const page = screen.getByTestId("achievements-page");
    // The page itself must not impose an additional `max-w-*`
    // narrower than the PageContainer's `max-w-6xl`. If a
    // future change reintroduces a `max-w-3xl` wrapper, the
    // achievements page would look narrower than stats /
    // library on desktop — exactly the bug the inner-wrapper
    // refactor removed.
    expect(page.className).not.toMatch(/max-w-3xl/);
    expect(page.className).not.toMatch(/max-w-2xl/);
    expect(page.className).not.toMatch(/max-w-xl/);
    expect(page.className).not.toMatch(/max-w-lg/);
  });
});
