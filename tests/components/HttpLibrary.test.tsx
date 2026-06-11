import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";

import { HttpLibrary } from "@/components/HttpLibrary";
import { __resetBookLibrary, useBookLibrary } from "@/state/book-library";
import { HttpStorageError } from "@/storage/http-storage-adapter";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/library",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

type Responder = (url: string, init: RequestInit) => {
  status: number;
  body?: string;
};

interface FetchStub {
  fetch: typeof fetch;
  calls: { url: string; init: RequestInit }[];
}

function makeFetch(impl: Responder): FetchStub {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      const initWithDefaults = init ?? {};
      const urlString = typeof url === "string" ? url : url.toString();
      calls.push({ url: urlString, init: initWithDefaults });
      const result = impl(urlString, initWithDefaults);
      const headers = new Headers();
      if (result.body !== undefined) {
        headers.set("content-type", "application/json");
      }
      return new Response(result.body ?? "", {
        status: result.status,
        headers,
      });
    },
  );
  return { fetch: fetchImpl as unknown as typeof fetch, calls };
}

let activeStub: FetchStub | null = null;
const originalFetch = globalThis.fetch;

function useStub(stub: FetchStub) {
  activeStub = stub;
  globalThis.fetch = stub.fetch;
}

beforeEach(() => {
  __resetBookLibrary();
  localStorage.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  activeStub = null;
  __resetBookLibrary();
});

describe("HttpLibrary", () => {
  it("initialises the store via useEffect (after commit), not during render", async () => {
    const stub = makeFetch((url) => {
      if (url.endsWith("/books")) return { status: 200, body: "[]" };
      if (/\/challenges\/\d+/.test(url)) return { status: 200, body: "null" };
      return { status: 404 };
    });
    useStub(stub);
    const onUnauth = vi.fn();
    render(
      <HttpLibrary
        apiBaseUrl="http://api"
        token="jwt-1"
        onUnauthenticated={onUnauth}
      >
        <div>child</div>
      </HttpLibrary>,
    );
    await waitFor(() =>
      expect(useBookLibrary.getState().status).toBe("ready"),
    );
    // Sanity: at least one network call to /books and one to
    // /challenges/{year} were issued — proves the init lived in an
    // effect (the store's status could only become "ready" through
    // that path).
    expect(
      stub.calls.some((c) => c.url.endsWith("/books")),
    ).toBe(true);
    expect(stub.calls.some((c) => /\/challenges\/\d+/.test(c.url))).toBe(true);
    expect(onUnauth).not.toHaveBeenCalled();
  });

  it("calls onUnauthenticated when init fails with 401", async () => {
    const stub = makeFetch((url) => {
      if (url.endsWith("/books")) {
        return {
          status: 401,
          body: JSON.stringify({ detail: "unauthorized" }),
        };
      }
      return { status: 404 };
    });
    useStub(stub);
    const onUnauth = vi.fn();
    render(
      <HttpLibrary
        apiBaseUrl="http://api"
        token="jwt-bad"
        onUnauthenticated={onUnauth}
      >
        <div>child</div>
      </HttpLibrary>,
    );
    await waitFor(() => expect(onUnauth).toHaveBeenCalled());
    expect(useBookLibrary.getState().status).toBe("error");
    expect(useBookLibrary.getState().lastError).toBeInstanceOf(
      HttpStorageError,
    );
  });

  it("does not call onUnauthenticated on non-401 init failures", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const stub = makeFetch((url) => {
      if (url.endsWith("/books")) return { status: 500, body: "{}" };
      return { status: 404 };
    });
    useStub(stub);
    const onUnauth = vi.fn();
    render(
      <HttpLibrary
        apiBaseUrl="http://api"
        token="jwt"
        onUnauthenticated={onUnauth}
      >
        <div>child</div>
      </HttpLibrary>,
    );
    await waitFor(() =>
      expect(useBookLibrary.getState().status).toBe("error"),
    );
    expect(onUnauth).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("re-initialises the store when the token changes", async () => {
    const stub = makeFetch((url) => {
      if (url.endsWith("/books")) return { status: 200, body: "[]" };
      if (/\/challenges\/\d+/.test(url)) return { status: 200, body: "null" };
      return { status: 404 };
    });
    useStub(stub);
    const onUnauth = vi.fn();
    const { rerender } = render(
      <HttpLibrary
        apiBaseUrl="http://api"
        token="jwt-1"
        onUnauthenticated={onUnauth}
      >
        <div>child</div>
      </HttpLibrary>,
    );
    await waitFor(() =>
      expect(useBookLibrary.getState().status).toBe("ready"),
    );
    const callsAfterFirst = stub.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);
    rerender(
      <HttpLibrary
        apiBaseUrl="http://api"
        token="jwt-2"
        onUnauthenticated={onUnauth}
      >
        <div>child</div>
      </HttpLibrary>,
    );
    await waitFor(() => {
      expect(stub.calls.length).toBeGreaterThan(callsAfterFirst);
    });
    expect(onUnauth).not.toHaveBeenCalled();
  });

  it("reacts to a runtime 401 by calling onUnauthenticated", async () => {
    const stub = makeFetch((url, init) => {
      if (url.endsWith("/books")) {
        if (init.method === "GET") {
          return { status: 200, body: "[]" };
        }
        return {
          status: 401,
          body: JSON.stringify({ detail: "expired" }),
        };
      }
      if (/\/challenges\/\d+/.test(url)) return { status: 200, body: "null" };
      return { status: 404 };
    });
    useStub(stub);
    const onUnauth = vi.fn();
    render(
      <HttpLibrary
        apiBaseUrl="http://api"
        token="jwt-1"
        onUnauthenticated={onUnauth}
      >
        <div>child</div>
      </HttpLibrary>,
    );
    await waitFor(() =>
      expect(useBookLibrary.getState().status).toBe("ready"),
    );

    // Trigger a runtime 401.
    await act(async () => {
      try {
        await useBookLibrary.getState().addBook({
          title: "X",
          author: "Y",
          status: "reading",
          tags: [],
        });
      } catch {
        // expected
      }
    });
    await waitFor(() => expect(onUnauth).toHaveBeenCalled());
  });
});

