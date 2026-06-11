import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useAchievements,
  __resetAchievements,
} from "@/state/achievements";
import type { Book } from "@/types/book";
import type { AchievementUnlock } from "@/types/achievement";
import type { StorageAdapter } from "@/storage/storage-adapter";

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: overrides.id ?? "b1",
    title: overrides.title ?? "T",
    author: overrides.author ?? "A",
    status: overrides.status ?? "want",
    tags: overrides.tags ?? [],
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeFakeAdapter(
  overrides: Partial<StorageAdapter> = {}
): StorageAdapter {
  return {
    listBooks: vi.fn().mockResolvedValue([]),
    addBook: vi.fn(),
    updateBook: vi.fn(),
    deleteBook: vi.fn(),
    getAnnualReadingChallenge: vi.fn().mockResolvedValue(null),
    saveAnnualReadingChallenge: vi.fn(),
    listAchievementUnlocks: vi.fn().mockResolvedValue([] as AchievementUnlock[]),
    saveAchievementUnlocks: vi
      .fn()
      .mockImplementation(
        async (u: AchievementUnlock[]): Promise<AchievementUnlock[]> => u
      ),
    ...overrides,
  };
}

describe("useAchievements", () => {
  beforeEach(() => {
    __resetAchievements();
  });

  it("starts in loading state with no unlocks and no error", () => {
    const state = useAchievements.getState();
    expect(state.status).toBe("loading");
    expect(state.unlocks).toEqual([]);
    expect(state.error).toBeNull();
    expect(state.notification).toBeNull();
  });

  it("init loads saved unlocks and reconciles silently when books already qualify", async () => {
    const adapter = makeFakeAdapter({
      listAchievementUnlocks: vi.fn().mockResolvedValue([
        {
          achievementId: "first-finished-book",
          unlockedAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    });
    const books = [book({ id: "a", status: "read" })];
    await useAchievements
      .getState()
      .init(adapter, { now: () => new Date("2026-02-01T00:00:00.000Z") }, books);
    const state = useAchievements.getState();
    expect(state.status).toBe("ready");
    expect(state.unlocks.map((u) => u.achievementId)).toEqual([
      "first-finished-book",
    ]);
    expect(state.notification).toBeNull();
  });

  it("init silently discovers matches and uses the discovery timestamp", async () => {
    const adapter = makeFakeAdapter();
    const books = [
      book({ id: "a", status: "read" }),
      book({ id: "b", status: "read" }),
      book({ id: "c", status: "read" }),
      book({ id: "d", status: "read" }),
      book({ id: "e", status: "read" }),
    ];
    await useAchievements
      .getState()
      .init(adapter, { now: () => new Date("2026-02-01T00:00:00.000Z") }, books);
    const state = useAchievements.getState();
    expect(state.status).toBe("ready");
    const ids = state.unlocks.map((u) => u.achievementId);
    expect(ids).toContain("first-finished-book");
    expect(ids).toContain("five-finished-books");
    expect(state.notification).toBeNull();
    for (const unlock of state.unlocks) {
      expect(unlock.unlockedAt).toBe("2026-02-01T00:00:00.000Z");
    }
  });

  it("evaluate after init exposes one notification per non-silent batch", async () => {
    const adapter = makeFakeAdapter();
    await useAchievements
      .getState()
      .init(adapter, undefined, []);
    expect(useAchievements.getState().notification).toBeNull();
    const books = [book({ id: "a", status: "read" })];
    await useAchievements
      .getState()
      .evaluate({ now: () => new Date("2026-03-01T00:00:00.000Z") }, books);
    const state = useAchievements.getState();
    expect(state.notification).not.toBeNull();
    expect(state.notification?.ids).toContain("first-finished-book");
  });

  it("evaluate stays silent when called with silent: true", async () => {
    const adapter = makeFakeAdapter();
    await useAchievements
      .getState()
      .init(adapter, undefined, []);
    const books = [book({ id: "a", status: "read" })];
    await useAchievements
      .getState()
      .evaluate(
        { silent: true, now: () => new Date("2026-03-01T00:00:00.000Z") },
        books
      );
    expect(useAchievements.getState().notification).toBeNull();
  });

  it("acknowledgeNotification clears the payload", async () => {
    const adapter = makeFakeAdapter();
    await useAchievements
      .getState()
      .init(adapter, undefined, []);
    await useAchievements
      .getState()
      .evaluate({ now: () => new Date("2026-03-01T00:00:00.000Z") }, [
        book({ id: "a", status: "read" }),
      ]);
    expect(useAchievements.getState().notification).not.toBeNull();
    useAchievements.getState().acknowledgeNotification();
    expect(useAchievements.getState().notification).toBeNull();
  });

  it("unlocks remain visible after a save failure (optimistic keep)", async () => {
    const adapter = makeFakeAdapter({
      saveAchievementUnlocks: vi
        .fn()
        .mockRejectedValue(new Error("network")),
    });
    await useAchievements
      .getState()
      .init(adapter, undefined, []);
    await useAchievements
      .getState()
      .evaluate({ now: () => new Date("2026-03-01T00:00:00.000Z") }, [
        book({ id: "a", status: "read" }),
      ]);
    const state = useAchievements.getState();
    expect(state.error).toMatch(/could not save/i);
    expect(state.unlocks.map((u) => u.achievementId)).toContain(
      "first-finished-book"
    );
  });

  it("does not re-send an already-saved ID on later evaluations", async () => {
    const saveSpy = vi
      .fn()
      .mockImplementation(
        async (u: AchievementUnlock[]) => u,
      );
    const adapter = makeFakeAdapter({
      listAchievementUnlocks: vi.fn().mockResolvedValue([]),
      saveAchievementUnlocks: saveSpy,
    });
    await useAchievements
      .getState()
      .init(
        adapter,
        { now: () => new Date("2026-03-01T00:00:00.000Z") },
        [book({ id: "a", status: "read" })]
      );
    expect(saveSpy).toHaveBeenCalledTimes(1);
    await useAchievements
      .getState()
      .evaluate(
        { now: () => new Date("2026-12-01T00:00:00.000Z") },
        [book({ id: "a", status: "read" })]
      );
    // Second evaluation must not re-send the same ID — the
    // store has confirmed it as saved.
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it("init sets error status when load fails and rethrows", async () => {
    const adapter = makeFakeAdapter({
      listAchievementUnlocks: vi
        .fn()
        .mockRejectedValue(new Error("quota")),
    });
    await expect(
      useAchievements.getState().init(adapter, undefined, [])
    ).rejects.toThrow(/quota/);
    const state = useAchievements.getState();
    expect(state.status).toBe("error");
    expect(state.error).toMatch(/could not load/i);
  });

  it("init resets state when called with a different adapter instance", async () => {
    const first = makeFakeAdapter();
    await useAchievements.getState().init(first, undefined, [
      book({ id: "a", status: "read" }),
    ]);
    expect(useAchievements.getState().unlocks.length).toBeGreaterThan(0);
    const second = makeFakeAdapter();
    await useAchievements.getState().init(second, undefined, []);
    const state = useAchievements.getState();
    expect(state.unlocks).toEqual([]);
    expect(state.status).toBe("ready");
  });

  it("retry reloads unlocks from the adapter and clears error", async () => {
    let stored: AchievementUnlock[] = [
      {
        achievementId: "first-finished-book",
        unlockedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const adapter = makeFakeAdapter({
      listAchievementUnlocks: vi
        .fn()
        .mockImplementation(async () => stored),
    });
    await useAchievements.getState().init(adapter, undefined, []);
    stored = [
      {
        achievementId: "first-quote",
        unlockedAt: "2026-02-01T00:00:00.000Z",
      },
    ];
    useAchievements.setState({ status: "error", error: "boom" });
    await useAchievements.getState().retry();
    const state = useAchievements.getState();
    expect(state.status).toBe("ready");
    expect(state.error).toBeNull();
    expect(state.unlocks.map((u) => u.achievementId)).toEqual(["first-quote"]);
  });

  it("after save failure, retry sends the same batch and clears pending", async () => {
    let attempts = 0;
    const saveSpy = vi
      .fn()
      .mockImplementation(async (u: AchievementUnlock[]) => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("network");
        }
        return u;
      });
    const adapter = makeFakeAdapter({
      listAchievementUnlocks: vi.fn().mockResolvedValue([]),
      saveAchievementUnlocks: saveSpy,
    });
    await useAchievements.getState().init(adapter, undefined, []);
    await useAchievements
      .getState()
      .evaluate({ now: () => new Date("2026-03-01T00:00:00.000Z") }, [
        book({ id: "a", status: "read" }),
      ]);
    expect(useAchievements.getState().pendingUnlocks).toHaveLength(1);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    await useAchievements.getState().retry();
    expect(saveSpy).toHaveBeenCalledTimes(2);
    const state = useAchievements.getState();
    expect(state.pendingUnlocks).toEqual([]);
    expect(state.error).toBeNull();
    expect(state.unlocks.map((u) => u.achievementId)).toContain(
      "first-finished-book"
    );
  });

  it("after save failure, a later evaluate re-queues the failed IDs and resends the union", async () => {
    const saveSpy = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce([]);
    const adapter = makeFakeAdapter({
      listAchievementUnlocks: vi.fn().mockResolvedValue([]),
      saveAchievementUnlocks: saveSpy,
    });
    await useAchievements.getState().init(adapter, undefined, []);
    await useAchievements
      .getState()
      .evaluate({ now: () => new Date("2026-03-01T00:00:00.000Z") }, [
        book({ id: "a", status: "read" }),
      ]);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy.mock.calls[0]?.[0].map((u: AchievementUnlock) => u.achievementId)).toEqual(
      ["first-finished-book"],
    );
    // Second evaluate with a richer library must include the
    // previously-failed ID in the next save batch.
    await useAchievements
      .getState()
      .evaluate({ now: () => new Date("2026-03-02T00:00:00.000Z") }, [
        book({ id: "a", status: "read" }),
        book({
          id: "b",
          status: "read",
          quotes: [
            {
              id: "q1",
              text: "quote",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      ]);
    expect(saveSpy).toHaveBeenCalledTimes(2);
    const secondBatch = saveSpy.mock.calls[1]?.[0] as AchievementUnlock[];
    expect(secondBatch.map((u) => u.achievementId).sort()).toEqual([
      "first-finished-book",
      "first-quote",
    ]);
  });

  it("retry with empty pending reloads from storage", async () => {
    const listSpy = vi.fn().mockResolvedValue([]);
    const saveSpy = vi.fn().mockResolvedValue([]);
    const adapter = makeFakeAdapter({
      listAchievementUnlocks: listSpy,
      saveAchievementUnlocks: saveSpy,
    });
    await useAchievements.getState().init(adapter, undefined, []);
    // No books -> no eligible -> no save in the silent eval.
    expect(saveSpy).toHaveBeenCalledTimes(0);
    useAchievements.setState({ status: "error", error: "boom" });
    await useAchievements.getState().retry();
    expect(saveSpy).toHaveBeenCalledTimes(0);
    expect(useAchievements.getState().pendingUnlocks).toEqual([]);
    expect(useAchievements.getState().status).toBe("ready");
  });

  it("a successful save adds the IDs to savedIds so they are never re-sent", async () => {
    const saveSpy = vi
      .fn()
      .mockImplementation(async (u: AchievementUnlock[]) => u);
    const adapter = makeFakeAdapter({
      listAchievementUnlocks: vi.fn().mockResolvedValue([]),
      saveAchievementUnlocks: saveSpy,
    });
    await useAchievements
      .getState()
      .init(
        adapter,
        undefined,
        [book({ id: "a", status: "read" })],
      );
    expect(saveSpy).toHaveBeenCalledTimes(1);
    // Re-mount with the same adapter and the same library — the
    // ID is already saved so no second save fires.
    await useAchievements
      .getState()
      .init(adapter, undefined, [book({ id: "a", status: "read" })]);
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });
});
