import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { toast } from "sonner";
import { AchievementToastBridge } from "@/features/achievements/AchievementToastBridge";
import {
  __resetAchievements,
  useAchievements,
} from "@/state/achievements";
import type { AchievementUnlock } from "@/types/achievement";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  __resetAchievements();
  pushMock.mockReset();
  vi.restoreAllMocks();
});

describe("AchievementToastBridge", () => {
  it("renders a single toast for one unlock", async () => {
    const spy = vi.spyOn(toast, "success").mockImplementation(() => "id");
    const unlock: AchievementUnlock = {
      achievementId: "first-finished-book",
      unlockedAt: "2026-01-10T00:00:00.000Z",
    };
    await act(async () => {
      useAchievements.setState({
        notification: { ids: ["first-finished-book"], unlockedAt: unlock.unlockedAt },
      });
      render(<AchievementToastBridge />);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toMatch(/first steps/i);
    expect(useAchievements.getState().notification).toBeNull();
  });

  it("renders an aggregate toast for several unlocks", async () => {
    const spy = vi.spyOn(toast, "success").mockImplementation(() => "id");
    await act(async () => {
      useAchievements.setState({
        notification: {
          ids: ["first-finished-book", "first-quote", "first-review"],
          unlockedAt: "2026-01-10T00:00:00.000Z",
        },
      });
      render(<AchievementToastBridge />);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toMatch(/3 achievements unlocked/i);
    expect(useAchievements.getState().notification).toBeNull();
  });

  it("does not render a toast when no notification is queued", async () => {
    const spy = vi.spyOn(toast, "success").mockImplementation(() => "id");
    await act(async () => {
      render(<AchievementToastBridge />);
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not re-fire for the same notification twice", async () => {
    const spy = vi.spyOn(toast, "success").mockImplementation(() => "id");
    const unlock: AchievementUnlock = {
      achievementId: "first-finished-book",
      unlockedAt: "2026-01-10T00:00:00.000Z",
    };
    await act(async () => {
      useAchievements.setState({
        notification: { ids: ["first-finished-book"], unlockedAt: unlock.unlockedAt },
      });
      render(<AchievementToastBridge />);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    // Reassigning the same payload should not re-render.
    await act(async () => {
      useAchievements.setState({
        notification: { ids: ["first-finished-book"], unlockedAt: unlock.unlockedAt },
      });
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
