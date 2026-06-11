import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AchievementsPreview } from "@/features/achievements/AchievementsPreview";
import {
  __resetAchievements,
  useAchievements,
} from "@/state/achievements";
import type { AchievementUnlock } from "@/types/achievement";

beforeEach(() => {
  __resetAchievements();
});

function setUnlocks(unlocks: AchievementUnlock[]) {
  useAchievements.setState({ status: "ready", unlocks });
}

describe("AchievementsPreview", () => {
  it("renders gentle empty copy when no unlocks exist", () => {
    setUnlocks([]);
    render(<AchievementsPreview />);
    const section = screen.getByTestId("achievements-preview");
    expect(section.dataset["state"]).toBe("empty");
    expect(
      within(section).getByTestId("achievements-preview-empty"),
    ).toBeInTheDocument();
  });

  it("shows the three latest unlocks as compact rows in newest-first order", () => {
    setUnlocks([
      {
        achievementId: "first-finished-book",
        unlockedAt: "2026-01-10T00:00:00.000Z",
      },
      {
        achievementId: "first-quote",
        unlockedAt: "2026-01-09T00:00:00.000Z",
      },
      {
        achievementId: "first-review",
        unlockedAt: "2026-01-08T00:00:00.000Z",
      },
      {
        achievementId: "five-rated-books",
        unlockedAt: "2026-01-07T00:00:00.000Z",
      },
    ]);
    render(<AchievementsPreview />);
    const section = screen.getByTestId("achievements-preview");
    expect(section.dataset["state"]).toBe("ready");
    const rows = within(section).getAllByTestId("achievement-preview-row");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.dataset["achievementId"])).toEqual([
      "first-finished-book",
      "first-quote",
      "first-review",
    ]);
    expect(within(section).queryByTestId("achievement-card")).not.toBeInTheDocument();
    expect(
      within(section).getByTestId("achievements-preview-view-all"),
    ).toHaveAttribute("href", "/achievements");
  });

  it("renders a retry affordance in the error state", () => {
    useAchievements.setState({
      status: "error",
      error: "Could not load your achievements.",
    });
    render(<AchievementsPreview />);
    const section = screen.getByTestId("achievements-preview");
    expect(section.dataset["state"]).toBe("error");
    expect(
      within(section).getByTestId("achievements-preview-retry"),
    ).toBeInTheDocument();
  });

  it("after a save failure, the preview shows a retry banner but keeps the unlocked list visible", () => {
    useAchievements.setState({
      status: "ready",
      unlocks: [
        {
          achievementId: "first-finished-book",
          unlockedAt: "2026-01-10T00:00:00.000Z",
        },
      ],
      error: "Could not save your achievement progress. Please try again.",
      pendingUnlocks: [
        {
          achievementId: "first-finished-book",
          unlockedAt: "2026-01-10T00:00:00.000Z",
        },
      ],
    });
    render(<AchievementsPreview />);
    const section = screen.getByTestId("achievements-preview");
    // Section still reports `ready` so the list keeps rendering.
    expect(section.dataset["state"]).toBe("ready");
    const banner = within(section).getByTestId(
      "achievements-preview-save-banner",
    );
    expect(banner).toHaveAttribute("role", "alert");
    expect(
      within(banner).getByTestId("achievements-preview-save-retry"),
    ).toBeInTheDocument();
    // The compact unlocked row is still visible alongside the banner.
    expect(
      within(section).getAllByTestId("achievement-preview-row"),
    ).toHaveLength(1);
    expect(within(section).queryByTestId("achievement-card")).not.toBeInTheDocument();
  });
});
