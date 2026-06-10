import { describe, expect, it, vi } from "vitest";

import { HttpStorageAdapter, HttpStorageError } from "@/storage/http-storage-adapter";
import type { Book, BookInput } from "@/types/book";
import type { AnnualReadingChallenge, AnnualReadingChallengeInput } from "@/types/challenge";
import type { AchievementUnlock } from "@/types/achievement";

interface RecordedCall {
  url: string;
  init: RequestInit;
}

function makeFetch(
  impl: (
    url: string,
    init: RequestInit,
  ) => { status: number; body?: string; headers?: Record<string, string> },
): { fetch: typeof fetch; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const initWithDefaults = init ?? {};
    const urlString = typeof url === "string" ? url : url.toString();
    calls.push({ url: urlString, init: initWithDefaults });
    const result = impl(urlString, initWithDefaults);
    const headers = new Headers(result.headers ?? {});
    if (!headers.has("content-type") && result.body !== undefined) {
      headers.set("content-type", "application/json");
    }
    // 204/205/304 responses cannot have a body — pass null to silence
    // the "Response constructor: Invalid response status code" error.
    const body = result.status === 204 || result.status === 205 ? null : (result.body ?? "");
    return new Response(body, {
      status: result.status,
      headers,
    });
  }) as unknown as typeof fetch;
  return { fetch: fetchImpl, calls };
}

const sampleBook: Book = {
  id: "book-1",
  title: "Hobbit",
  author: "Tolkien",
  status: "reading",
  tags: [],
  createdAt: "2024-01-01T00:00:00Z",
};

const sampleInput: BookInput = {
  title: "Hobbit",
  author: "Tolkien",
  status: "reading",
  tags: [],
};

describe("HttpStorageAdapter", () => {
  it("strips trailing slashes from baseUrl", async () => {
    const { fetch } = makeFetch((url, init) => {
      expect(url).toBe("http://api.example.com/books");
      expect(init.headers).toMatchObject({ Authorization: "Bearer t" });
      return { status: 200, body: "[]" };
    });
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com////",
      getToken: () => "t",
      fetchImpl: fetch,
    });
    await expect(adapter.listBooks()).resolves.toEqual([]);
  });

  it("throws when no token is available", async () => {
    const { fetch } = makeFetch(() => ({ status: 200, body: "[]" }));
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => null,
      fetchImpl: fetch,
    });
    await expect(adapter.listBooks()).rejects.toBeInstanceOf(HttpStorageError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("listBooks returns parsed JSON", async () => {
    const { fetch, calls } = makeFetch(() => ({
      status: 200,
      body: JSON.stringify([sampleBook]),
    }));
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => "abc",
      fetchImpl: fetch,
    });
    const books = await adapter.listBooks();
    expect(books).toEqual([sampleBook]);
    expect(calls).toHaveLength(1);
    expect(calls[0].init.method).toBe("GET");
    expect(calls[0].init.headers).toMatchObject({
      Authorization: "Bearer abc",
      Accept: "application/json",
    });
  });

  it("addBook POSTs JSON body and returns the book", async () => {
    const { fetch, calls } = makeFetch((_url, init) => ({
      status: 201,
      body: JSON.stringify(sampleBook),
    }));
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => "abc",
      fetchImpl: fetch,
    });
    const created = await adapter.addBook(sampleInput);
    expect(created).toEqual(sampleBook);
    const call = calls[0];
    expect(call.init.method).toBe("POST");
    expect(call.init.body).toBe(JSON.stringify(sampleInput));
    expect((call.init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("addBook rejects on duplicate id with HttpStorageError 409", async () => {
    const { fetch } = makeFetch(() => ({
      status: 409,
      body: JSON.stringify({ detail: "duplicate" }),
    }));
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => "abc",
      fetchImpl: fetch,
    });
    await expect(adapter.addBook(sampleInput)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("updateBook PUTs the encoded id and returns the updated book", async () => {
    const updated: Book = { ...sampleBook, title: "Updated" };
    const { fetch, calls } = makeFetch((url, init) => {
      expect(url).toBe("http://api.example.com/books/book%20with%20space");
      expect(init.method).toBe("PUT");
      return { status: 200, body: JSON.stringify(updated) };
    });
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => "abc",
      fetchImpl: fetch,
    });
    const result = await adapter.updateBook("book with space", sampleInput);
    expect(result).toEqual(updated);
    expect(calls).toHaveLength(1);
  });

  it("updateBook maps 404 to HttpStorageError", async () => {
    const { fetch } = makeFetch(() => ({ status: 404, body: "{}" }));
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => "abc",
      fetchImpl: fetch,
    });
    await expect(
      adapter.updateBook("missing", sampleInput),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("deleteBook returns void on 204", async () => {
    const { fetch, calls } = makeFetch((url, init) => {
      expect(url).toBe("http://api.example.com/books/b1");
      expect(init.method).toBe("DELETE");
      return { status: 204 };
    });
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => "abc",
      fetchImpl: fetch,
    });
    await expect(adapter.deleteBook("b1")).resolves.toBeUndefined();
    expect(calls).toHaveLength(1);
  });

  it("deleteBook maps 404 to HttpStorageError", async () => {
    const { fetch } = makeFetch(() => ({ status: 404, body: "{}" }));
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => "abc",
      fetchImpl: fetch,
    });
    await expect(adapter.deleteBook("missing")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("getAnnualReadingChallenge returns null for a 200 with null body", async () => {
    const { fetch } = makeFetch(() => ({ status: 200, body: "null" }));
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => "abc",
      fetchImpl: fetch,
    });
    await expect(adapter.getAnnualReadingChallenge(2026)).resolves.toBeNull();
  });

  it("getAnnualReadingChallenge returns the challenge shape when present", async () => {
    const challenge: AnnualReadingChallenge = {
      year: 2026,
      targetBooks: 12,
      updatedAt: "2026-01-15T12:00:00Z",
    };
    const { fetch, calls } = makeFetch((url) => {
      expect(url).toBe("http://api.example.com/challenges/2026");
      return { status: 200, body: JSON.stringify(challenge) };
    });
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => "abc",
      fetchImpl: fetch,
    });
    await expect(adapter.getAnnualReadingChallenge(2026)).resolves.toEqual(
      challenge,
    );
    expect(calls[0].init.method).toBe("GET");
  });

  it("saveAnnualReadingChallenge PUTs the year and target_books", async () => {
    const challenge: AnnualReadingChallenge = {
      year: 2026,
      targetBooks: 24,
      updatedAt: "2026-02-01T00:00:00Z",
    };
    const input: AnnualReadingChallengeInput = { year: 2026, targetBooks: 24 };
    const { fetch, calls } = makeFetch((url, init) => {
      expect(url).toBe("http://api.example.com/challenges/2026");
      expect(init.method).toBe("PUT");
      expect(init.body).toBe(JSON.stringify({ year: 2026, target_books: 24 }));
      return { status: 200, body: JSON.stringify(challenge) };
    });
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => "abc",
      fetchImpl: fetch,
    });
    await expect(adapter.saveAnnualReadingChallenge(input)).resolves.toEqual(
      challenge,
    );
    expect(calls).toHaveLength(1);
  });

  it("maps a 401 response to HttpStorageError(unauthorized)", async () => {
    const { fetch } = makeFetch(() => ({ status: 401, body: "{}" }));
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => "abc",
      fetchImpl: fetch,
    });
    await expect(adapter.listBooks()).rejects.toMatchObject({
      status: 401,
      message: "unauthorized",
    });
  });

  it("wraps a thrown fetch (network failure) in HttpStorageError", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => "abc",
      fetchImpl,
    });
    await expect(adapter.listBooks()).rejects.toBeInstanceOf(HttpStorageError);
    await expect(adapter.listBooks()).rejects.toMatchObject({
      status: 0,
    });
  });

  it("wraps malformed JSON in HttpStorageError", async () => {
    const { fetch } = makeFetch(() => ({ status: 200, body: "not-json" }));
    const adapter = new HttpStorageAdapter({
      baseUrl: "http://api.example.com",
      getToken: () => "abc",
      fetchImpl: fetch,
    });
    await expect(adapter.listBooks()).rejects.toBeInstanceOf(HttpStorageError);
  });

  describe("achievements", () => {
    it("listAchievementUnlocks GETs /achievements and returns unlocks", async () => {
      const responseBody: { unlocks: AchievementUnlock[] } = {
        unlocks: [
          {
            achievementId: "first-finished-book",
            unlockedAt: "2026-01-01T00:00:00Z",
          },
        ],
      };
      const { fetch, calls } = makeFetch((url, init) => {
        expect(url).toBe("http://api.example.com/achievements");
        expect(init.method).toBe("GET");
        return { status: 200, body: JSON.stringify(responseBody) };
      });
      const adapter = new HttpStorageAdapter({
        baseUrl: "http://api.example.com",
        getToken: () => "abc",
        fetchImpl: fetch,
      });
      const result = await adapter.listAchievementUnlocks();
      expect(result).toEqual(responseBody.unlocks);
      expect(calls).toHaveLength(1);
    });

    it("listAchievementUnlocks returns an empty array when the server returns no unlocks", async () => {
      const { fetch } = makeFetch(() => ({
        status: 200,
        body: JSON.stringify({ unlocks: [] }),
      }));
      const adapter = new HttpStorageAdapter({
        baseUrl: "http://api.example.com",
        getToken: () => "abc",
        fetchImpl: fetch,
      });
      const result = await adapter.listAchievementUnlocks();
      expect(result).toEqual([]);
    });

    it("saveAchievementUnlocks POSTs snake_case payload to /achievements/unlocks and returns canonical unlocks", async () => {
      const unlocks: AchievementUnlock[] = [
        {
          achievementId: "first-finished-book",
          unlockedAt: "2026-01-01T00:00:00Z",
        },
        {
          achievementId: "first-quote",
          unlockedAt: "2026-01-02T00:00:00Z",
        },
      ];
      const canonical: AchievementUnlock[] = unlocks.map((u) => ({
        ...u,
      }));
      const { fetch, calls } = makeFetch((url, init) => {
        expect(url).toBe("http://api.example.com/achievements/unlocks");
        expect(init.method).toBe("POST");
        expect(init.body).toBe(
          JSON.stringify({
            unlocks: [
              {
                achievement_id: "first-finished-book",
                unlocked_at: "2026-01-01T00:00:00Z",
              },
              {
                achievement_id: "first-quote",
                unlocked_at: "2026-01-02T00:00:00Z",
              },
            ],
          }),
        );
        return {
          status: 200,
          body: JSON.stringify({ unlocks: canonical }),
        };
      });
      const adapter = new HttpStorageAdapter({
        baseUrl: "http://api.example.com",
        getToken: () => "abc",
        fetchImpl: fetch,
      });
      const result = await adapter.saveAchievementUnlocks(unlocks);
      expect(result).toEqual(canonical);
      expect(calls).toHaveLength(1);
    });

    it("saveAchievementUnlocks skips the network call when the input is empty", async () => {
      const { fetch, calls } = makeFetch(() => {
        throw new Error("should not be called");
      });
      const adapter = new HttpStorageAdapter({
        baseUrl: "http://api.example.com",
        getToken: () => "abc",
        fetchImpl: fetch,
      });
      await expect(adapter.saveAchievementUnlocks([])).resolves.toEqual([]);
      expect(calls).toHaveLength(0);
    });

    it("saveAchievementUnlocks propagates 401 as HttpStorageError", async () => {
      const { fetch } = makeFetch(() => ({ status: 401, body: "{}" }));
      const adapter = new HttpStorageAdapter({
        baseUrl: "http://api.example.com",
        getToken: () => "abc",
        fetchImpl: fetch,
      });
      await expect(
        adapter.saveAchievementUnlocks([
          {
            achievementId: "first-finished-book",
            unlockedAt: "2026-01-01T00:00:00Z",
          },
        ]),
      ).rejects.toMatchObject({ status: 401, message: "unauthorized" });
    });

    it("listAchievementUnlocks wraps network failure in HttpStorageError", async () => {
      const fetchImpl = vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }) as unknown as typeof fetch;
      const adapter = new HttpStorageAdapter({
        baseUrl: "http://api.example.com",
        getToken: () => "abc",
        fetchImpl,
      });
      await expect(adapter.listAchievementUnlocks()).rejects.toBeInstanceOf(
        HttpStorageError,
      );
    });

    it("saveAchievementUnlocks wraps malformed JSON in HttpStorageError", async () => {
      const { fetch } = makeFetch(() => ({ status: 200, body: "not-json" }));
      const adapter = new HttpStorageAdapter({
        baseUrl: "http://api.example.com",
        getToken: () => "abc",
        fetchImpl: fetch,
      });
      await expect(
        adapter.saveAchievementUnlocks([
          {
            achievementId: "first-finished-book",
            unlockedAt: "2026-01-01T00:00:00Z",
          },
        ]),
      ).rejects.toBeInstanceOf(HttpStorageError);
    });
  });
});
