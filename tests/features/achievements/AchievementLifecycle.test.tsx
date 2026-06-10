import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { AchievementLifecycle } from "@/features/achievements/AchievementLifecycle";
import {
  __resetAchievements,
  useAchievements,
} from "@/state/achievements";
import {
  __resetBookLibrary,
  useBookLibrary,
} from "@/state/book-library";
import type { Book } from "@/types/book";
import type { StorageAdapter } from "@/storage/storage-adapter";
import type { AchievementUnlock } from "@/types/achievement";

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
    listAchievementUnlocks: vi
      .fn()
      .mockResolvedValue([] as AchievementUnlock[]),
    saveAchievementUnlocks: vi
      .fn()
      .mockImplementation(
        async (u: AchievementUnlock[]): Promise<AchievementUnlock[]> => u
      ),
    ...overrides,
  };
}

beforeEach(() => {
  __resetAchievements();
  __resetBookLibrary();
});

describe("AchievementLifecycle", () => {
  it("inits achievements when the book library is ready", async () => {
    const adapter = makeFakeAdapter();
    useBookLibrary.setState({
      status: "ready",
      books: [book({ id: "a", status: "read" })],
    });
    await act(async () => {
      render(<AchievementLifecycle adapter={adapter} />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    const state = useAchievements.getState();
    expect(state.status).toBe("ready");
    expect(state.unlocks.map((u) => u.achievementId)).toContain(
      "first-finished-book"
    );
    expect(state.notification).toBeNull();
  });

  it("does not enqueue a toast on the initial init", async () => {
    const adapter = makeFakeAdapter();
    useBookLibrary.setState({
      status: "ready",
      books: [
        book({ id: "a", status: "read" }),
        book({ id: "b", status: "read" }),
        book({ id: "c", status: "read" }),
        book({ id: "d", status: "read" }),
        book({ id: "e", status: "read" }),
      ],
    });
    await act(async () => {
      render(<AchievementLifecycle adapter={adapter} />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(useAchievements.getState().notification).toBeNull();
  });

  it("re-evaluates and enqueues a notification on later book changes", async () => {
    const adapter = makeFakeAdapter();
    useBookLibrary.setState({ status: "ready", books: [] });
    await act(async () => {
      render(<AchievementLifecycle adapter={adapter} />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(useAchievements.getState().notification).toBeNull();
    act(() => {
      useBookLibrary.setState({
        books: [book({ id: "a", status: "read" })],
      });
    });
    await act(async () => {
      await Promise.resolve();
    });
    const state = useAchievements.getState();
    expect(state.notification).not.toBeNull();
    expect(state.notification?.ids).toContain("first-finished-book");
  });

  it("does not change library status when achievement load fails", async () => {
    const adapter = makeFakeAdapter({
      listAchievementUnlocks: vi
        .fn()
        .mockRejectedValue(new Error("quota")),
    });
    useBookLibrary.setState({ status: "ready", books: [] });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => {
      render(<AchievementLifecycle adapter={adapter} />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(useBookLibrary.getState().status).toBe("ready");
    expect(useAchievements.getState().status).toBe("error");
    errSpy.mockRestore();
  });
});
