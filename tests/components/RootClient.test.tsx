import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { RootClient } from "@/components/RootClient";
import { __resetBookLibrary, useBookLibrary } from "@/state/book-library";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
  __resetBookLibrary();
});

afterEach(() => {
  vi.unstubAllEnvs();
  __resetBookLibrary();
});

describe("RootClient local mode", () => {
  it("initialises the store when NEXT_PUBLIC_STORAGE_MODE is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_MODE", undefined);
    render(
      <RootClient>
        <div>hello</div>
      </RootClient>,
    );
    await waitFor(() =>
      expect(useBookLibrary.getState().status).toBe("ready"),
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("initialises the store when NEXT_PUBLIC_STORAGE_MODE is local", async () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_MODE", "local");
    render(
      <RootClient>
        <div>hello</div>
      </RootClient>,
    );
    await waitFor(() =>
      expect(useBookLibrary.getState().status).toBe("ready"),
    );
  });

  it("does not render the login form in local mode", () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_MODE", "local");
    render(
      <RootClient>
        <div>children visible</div>
      </RootClient>,
    );
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.getByText("children visible")).toBeInTheDocument();
  });

  it("renders the existing localStorage-backed UI without backend env vars", async () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_MODE", "local");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", undefined);
    render(
      <RootClient>
        <div data-testid="ok">ok</div>
      </RootClient>,
    );
    expect(await screen.findByTestId("ok")).toBeInTheDocument();
  });
});

describe("RootClient http mode", () => {
  it("renders the login form before authentication and skips init", async () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_MODE", "http");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api");
    render(
      <RootClient>
        <div>protected</div>
      </RootClient>,
    );
    // Init must not have run yet — store should still be 'loading'.
    expect(useBookLibrary.getState().status).toBe("loading");
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
  });

  it("fails loudly when HTTP mode has no api base url", () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_MODE", "http");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <RootClient>
          <div>protected</div>
        </RootClient>,
      ),
    ).toThrow(/NEXT_PUBLIC_API_BASE_URL/);
    errSpy.mockRestore();
  });

  it("fails loudly on unknown storage mode", () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_MODE", "redis");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <RootClient>
          <div>protected</div>
        </RootClient>,
      ),
    ).toThrow(/Unknown NEXT_PUBLIC_STORAGE_MODE/);
    errSpy.mockRestore();
  });

  it("initialises the store after successful login", async () => {
    vi.stubEnv("NEXT_PUBLIC_STORAGE_MODE", "http");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api");

    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const urlString = typeof url === "string" ? url : url.toString();
      if (urlString.endsWith("/auth/login")) {
        return new Response(
          JSON.stringify({
            access_token: "jwt-1",
            token_type: "bearer",
            expires_in: 60,
          }),
          { status: 200 },
        );
      }
      if (urlString.endsWith("/books")) {
        return new Response("[]", { status: 200 });
      }
      if (/\/challenges\/\d+/.test(urlString)) {
        return new Response("null", { status: 200 });
      }
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
      render(
        <RootClient>
          <div data-testid="protected">protected</div>
        </RootClient>,
      );

      // Login form is visible.
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      // Submit credentials.
      fireEvent.input(screen.getByLabelText(/email/i), {
        target: { value: "a@b" },
      });
      fireEvent.input(screen.getByLabelText(/password/i), {
        target: { value: "pw" },
      });
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() =>
        expect(screen.getByTestId("protected")).toBeInTheDocument(),
      );
      // The store finished initialising.
      await waitFor(() =>
        expect(useBookLibrary.getState().status).toBe("ready"),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
