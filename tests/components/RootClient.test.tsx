import { describe, it, expect, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { RootClient } from "@/components/RootClient";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";

describe("RootClient", () => {
  beforeEach(() => {
    __resetBookLibrary();
    localStorage.clear();
  });

  it("initialises the library store on mount (regression for spec 005 reload bug)", async () => {
    // Sanity: the store starts in 'loading' with no books.
    expect(useBookLibrary.getState().status).toBe("loading");
    expect(useBookLibrary.getState().books).toEqual([]);

    render(
      <RootClient>
        <div data-testid="child">content</div>
      </RootClient>
    );

    // Children render synchronously…
    expect(
      document.querySelector('[data-testid="child"]')
    ).toBeInTheDocument();

    // …and the store is initialised after the effect tick.
    await waitFor(() => {
      expect(useBookLibrary.getState().status).toBe("ready");
    });
  });

  it("loads existing books from localStorage on init", async () => {
    // Seed localStorage with a book before RootClient mounts.
    const seeded = [
      {
        id: "seed-1",
        title: "Seeded Book",
        author: "Test",
        status: "reading",
        tags: [],
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ];
    localStorage.setItem("book-tracker:books", JSON.stringify(seeded));

    render(
      <RootClient>
        <div>content</div>
      </RootClient>
    );

    await waitFor(() => {
      expect(useBookLibrary.getState().status).toBe("ready");
    });
    expect(useBookLibrary.getState().books).toEqual(seeded);
  });
});
