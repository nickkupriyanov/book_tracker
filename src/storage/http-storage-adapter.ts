/**
 * HTTP implementation of {@link StorageAdapter}.
 *
 * Talks to the FastAPI backend added in spec 023. The token provider
 * returns the current access token from {@link import("@/features/auth").AuthGate}
 * — the adapter never owns token state itself.
 *
 * Errors are surfaced as plain `Error` instances; the existing
 * library/feature code already handles thrown errors with friendly
 * inline or toast feedback (spec 023 §5.3).
 */

import type {
  AnnualReadingChallenge,
  AnnualReadingChallengeInput,
} from "@/types/challenge";
import type { Book, BookInput } from "@/types/book";

import type { StorageAdapter } from "./storage-adapter";

export interface HttpStorageAdapterOptions {
  baseUrl: string;
  /**
   * Returns the current access token, or `null` when the user is not
   * authenticated. The adapter is constructed only after login, so
   * this is expected to return a non-null token in practice.
   */
  getToken: () => string | null;
  /**
   * Optional fetch override. Defaults to the global `fetch`. Tests use
   * this to inject a stub without monkey-patching globals.
   */
  fetchImpl?: typeof fetch;
}

export class HttpStorageError extends Error {
  readonly status: number;
  readonly bodyText: string;
  constructor(message: string, status: number, bodyText: string) {
    super(message);
    this.name = "HttpStorageError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export class HttpStorageAdapter implements StorageAdapter {
  private readonly baseUrl: string;
  private readonly getToken: () => string | null;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpStorageAdapterOptions) {
    this.baseUrl = trimTrailingSlash(options.baseUrl);
    this.getToken = options.getToken;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    if (!this.baseUrl) {
      throw new Error("HttpStorageAdapter: baseUrl is required");
    }
    if (typeof this.getToken !== "function") {
      throw new Error("HttpStorageAdapter: getToken must be a function");
    }
  }

  private async request<T>(input: {
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    body?: unknown;
    allowNull?: boolean;
  }): Promise<T> {
    const token = this.getToken();
    if (!token) {
      throw new HttpStorageError("missing access token", 0, "");
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    let body: BodyInit | undefined;
    if (input.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(input.body);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${input.path}`, {
        method: input.method,
        headers,
        body,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "network request failed";
      throw new HttpStorageError(message, 0, "");
    }

    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    if (response.status === 401) {
      throw new HttpStorageError("unauthorized", 401, text);
    }
    if (response.status === 404) {
      throw new HttpStorageError("not found", 404, text);
    }
    if (!response.ok) {
      throw new HttpStorageError(
        `request failed: ${response.status}`,
        response.status,
        text,
      );
    }
    if (input.allowNull && (text === "" || text === "null")) {
      return null as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "could not parse response";
      throw new HttpStorageError(message, response.status, text);
    }
  }

  listBooks(): Promise<Book[]> {
    return this.request<Book[]>({ method: "GET", path: "/books" });
  }

  addBook(input: BookInput): Promise<Book> {
    return this.request<Book>({
      method: "POST",
      path: "/books",
      body: input,
    });
  }

  updateBook(id: string, input: BookInput): Promise<Book> {
    return this.request<Book>({
      method: "PUT",
      path: `/books/${encodeURIComponent(id)}`,
      body: input,
    });
  }

  async deleteBook(id: string): Promise<void> {
    await this.request<void>({
      method: "DELETE",
      path: `/books/${encodeURIComponent(id)}`,
    });
  }

  getAnnualReadingChallenge(
    year: number,
  ): Promise<AnnualReadingChallenge | null> {
    return this.request<AnnualReadingChallenge | null>({
      method: "GET",
      path: `/challenges/${year}`,
      allowNull: true,
    });
  }

  saveAnnualReadingChallenge(
    input: AnnualReadingChallengeInput,
  ): Promise<AnnualReadingChallenge> {
    return this.request<AnnualReadingChallenge>({
      method: "PUT",
      path: `/challenges/${input.year}`,
      body: { year: input.year, target_books: input.targetBooks },
    });
  }
}
