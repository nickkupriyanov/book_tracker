import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AchievementCard } from "@/features/achievements/AchievementCard";
import {
  __resetAchievements,
  useAchievements,
} from "@/state/achievements";
import {
  ACHIEVEMENT_CATALOG,
  type AchievementDefinition,
} from "@/lib/achievements";
import type { AchievementUnlock } from "@/types/achievement";

function findDef(id: AchievementDefinition["id"]): AchievementDefinition {
  const def = ACHIEVEMENT_CATALOG.find((d) => d.id === id);
  if (!def) throw new Error(`missing definition: ${id}`);
  return def;
}

beforeEach(() => {
  __resetAchievements();
});

describe("AchievementCard", () => {
  it("renders the unlocked variant with title, description, and date", () => {
    const def = findDef("first-finished-book");
    const unlock: AchievementUnlock = {
      achievementId: "first-finished-book",
      unlockedAt: "2026-01-10T00:00:00.000Z",
    };
    render(<AchievementCard definition={def} unlock={unlock} />);
    const card = screen.getByTestId("achievement-card");
    expect(card.dataset["achievementState"]).toBe("unlocked");
    expect(card.dataset["achievementId"]).toBe("first-finished-book");
    expect(card).toHaveAccessibleName(/first steps/i);
    expect(card.textContent).toContain("2026-01-10");
    expect(card.textContent).toContain(def.description);
  });

  it("renders the visible-locked variant with the condition", () => {
    const def = findDef("five-rated-books");
    render(<AchievementCard definition={def} />);
    const card = screen.getByTestId("achievement-card");
    expect(card.dataset["achievementState"]).toBe("locked-visible");
    expect(card.textContent).toContain(def.condition);
    expect(card.textContent).toContain(def.title);
  });

  it("renders the secret-locked variant with neither title nor condition", () => {
    const def = findDef("long-read");
    const { container } = render(<AchievementCard definition={def} />);
    const card = screen.getByTestId("achievement-card");
    expect(card.dataset["achievementState"]).toBe("locked-secret");
    // The card body shows neutral copy only; the secret title
    // and condition live behind an `sr-only` paragraph for
    // assistive tech and must not appear in any non-sr-only
    // text node.
    const visibleText = Array.from(
      container.querySelectorAll<HTMLElement>(
        "[data-testid='achievement-card'] *:not(.sr-only)",
      ),
    )
      .map((el) => el.textContent ?? "")
      .join(" ");
    expect(visibleText).not.toContain(def.title);
    expect(visibleText).not.toContain(def.condition);
    expect(card.textContent).toMatch(/hidden achievement/i);
  });
});

describe("AchievementsClient", () => {
  it("renders the loading state from the store", async () => {
    const { AchievementsClient } = await import(
      "@/features/achievements/AchievementsClient"
    );
    useAchievements.setState({ status: "loading" });
    render(<AchievementsClient />);
    const page = screen.getByTestId("achievements-page");
    expect(page.dataset["state"]).toBe("loading");
  });

  it("renders the error state with a retry button", async () => {
    const { AchievementsClient } = await import(
      "@/features/achievements/AchievementsClient"
    );
    useAchievements.setState({
      status: "error",
      error: "Could not load your achievements.",
    });
    render(<AchievementsClient />);
    const page = screen.getByTestId("achievements-page");
    expect(page.dataset["state"]).toBe("error");
    expect(screen.getByTestId("achievements-retry")).toBeInTheDocument();
  });

  it("groups unlocked, visible-locked, and secret-locked in the right order", async () => {
    const { AchievementsClient } = await import(
      "@/features/achievements/AchievementsClient"
    );
    useAchievements.setState({
      status: "ready",
      unlocks: [
        {
          achievementId: "first-quote",
          unlockedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    render(<AchievementsClient />);
    const sections = screen.getAllByTestId("achievements-section");
    expect(sections.map((el) => el.dataset["section"])).toEqual([
      "unlocked",
      "visible-locked",
      "secret-locked",
    ]);
  });

  it("renders only the locked sections when no unlocks are present", async () => {
    const { AchievementsClient } = await import(
      "@/features/achievements/AchievementsClient"
    );
    useAchievements.setState({ status: "ready", unlocks: [] });
    render(<AchievementsClient />);
    const sections = screen.getAllByTestId("achievements-section");
    expect(sections.map((el) => el.dataset["section"])).toEqual([
      "visible-locked",
      "secret-locked",
    ]);
    expect(screen.getByTestId("achievements-empty")).toBeInTheDocument();
  });

  it("calls retry when the retry button is clicked in the error state", async () => {
    const { AchievementsClient } = await import(
      "@/features/achievements/AchievementsClient"
    );
    const retrySpy = vi.fn().mockResolvedValue(undefined);
    useAchievements.setState({
      status: "error",
      error: "Could not load your achievements.",
    });
    useAchievements.setState({ retry: retrySpy } as never);
    render(<AchievementsClient />);
    screen.getByTestId("achievements-retry").click();
    expect(retrySpy).toHaveBeenCalledTimes(1);
  });
});
