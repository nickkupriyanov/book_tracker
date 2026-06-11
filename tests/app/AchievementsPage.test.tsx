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
});
