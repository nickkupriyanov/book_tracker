import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  READING_CALENDAR_FALLBACK_COLOR,
  normalizeCoverColor,
  isCoverColor,
  colorForBook,
  dominantColorFromImageData,
  extractDominantCoverColor,
} from "@/lib/cover-color";
import type { Book } from "@/types/book";

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    title: "Piranesi",
    author: "Susanna Clarke",
    status: "reading",
    tags: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("READING_CALENDAR_FALLBACK_COLOR", () => {
  it("is a warm brownish hex color", () => {
    expect(READING_CALENDAR_FALLBACK_COLOR).toBe("#8a6f4d");
  });
});

describe("normalizeCoverColor", () => {
  it("returns undefined for undefined", () => {
    expect(normalizeCoverColor(undefined)).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(normalizeCoverColor(null)).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(normalizeCoverColor("")).toBeUndefined();
  });

  it("returns undefined for a whitespace-only string", () => {
    expect(normalizeCoverColor("   ")).toBeUndefined();
  });

  it("lowercases a valid 6-digit hex", () => {
    expect(normalizeCoverColor("#B85B45")).toBe("#b85b45");
  });

  it("lowercases a valid 3-digit hex", () => {
    expect(normalizeCoverColor("#F0A")).toBe("#f0a");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeCoverColor("  #b85b45  ")).toBe("#b85b45");
  });

  it("returns undefined for a non-hex string", () => {
    expect(normalizeCoverColor("red")).toBeUndefined();
  });

  it("returns undefined for a hex without leading #", () => {
    expect(normalizeCoverColor("b85b45")).toBeUndefined();
  });

  it("returns undefined for a 4-digit hex", () => {
    expect(normalizeCoverColor("#b85b")).toBeUndefined();
  });

  it("returns undefined for a 5-digit hex", () => {
    expect(normalizeCoverColor("#b85b4")).toBeUndefined();
  });

  it("returns undefined for a non-string value", () => {
    expect(normalizeCoverColor(42)).toBeUndefined();
  });
});

describe("isCoverColor", () => {
  it("accepts 6-digit lowercase", () => {
    expect(isCoverColor("#b85b45")).toBe(true);
  });

  it("accepts 3-digit", () => {
    expect(isCoverColor("#f0a")).toBe(true);
  });

  it("accepts uppercase letters", () => {
    expect(isCoverColor("#B85B45")).toBe(true);
  });

  it("rejects without #", () => {
    expect(isCoverColor("b85b45")).toBe(false);
  });

  it("rejects invalid characters", () => {
    expect(isCoverColor("#b85b4g")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isCoverColor("")).toBe(false);
  });
});

describe("colorForBook", () => {
  it("returns the book's coverColor when set", () => {
    expect(colorForBook(makeBook({ coverColor: "#b85b45" }))).toBe("#b85b45");
  });

  it("normalises a mixed-case coverColor", () => {
    expect(colorForBook(makeBook({ coverColor: "#B85B45" }))).toBe("#b85b45");
  });

  it("falls back when coverColor is missing", () => {
    expect(colorForBook(makeBook())).toBe(READING_CALENDAR_FALLBACK_COLOR);
  });

  it("falls back when coverColor is undefined", () => {
    expect(colorForBook(makeBook({ coverColor: undefined }))).toBe(
      READING_CALENDAR_FALLBACK_COLOR
    );
  });

  it("falls back when coverColor is an empty string (defensive)", () => {
    expect(colorForBook(makeBook({ coverColor: "" }))).toBe(
      READING_CALENDAR_FALLBACK_COLOR
    );
  });

  it("falls back when coverColor is malformed (defensive)", () => {
    // The validator prevents this in normal flow; the helper stays
    // defensive so a corrupted localStorage record never breaks the
    // calendar. Spec 013 §10 "Bad color".
    expect(
      colorForBook(makeBook({ coverColor: "not-a-color" as unknown as string }))
    ).toBe(READING_CALENDAR_FALLBACK_COLOR);
  });
});

describe("dominantColorFromImageData", () => {
  // Helper: build a flat RGBA Uint8ClampedArray from a list of
  // (r, g, b, a) tuples.
  function pixels(...rgba: [number, number, number, number?][]): Uint8ClampedArray {
    const out = new Uint8ClampedArray(rgba.length * 4);
    for (let i = 0; i < rgba.length; i++) {
      const [r, g, b, a = 255] = rgba[i]!;
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = a;
    }
    return out;
  }

  it("returns null for an empty image", () => {
    expect(dominantColorFromImageData(new Uint8ClampedArray(0))).toBeNull();
  });

  it("returns null for an all-transparent image", () => {
    expect(dominantColorFromImageData(pixels([0, 0, 0, 0]))).toBeNull();
  });

  it("returns a hex color for a solid red image", () => {
    const data = pixels([200, 0, 0], [200, 0, 0], [200, 0, 0]);
    const result = dominantColorFromImageData(data);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    // Quantized: 200 → 192 (200 >> 4 = 12, 12 << 4 = 192)
    expect(result).toBe("#c00000");
  });

  it("picks the most common color among several", () => {
    const data = pixels(
      [200, 0, 0],
      [200, 0, 0],
      [200, 0, 0],
      [0, 0, 200]
    );
    expect(dominantColorFromImageData(data)).toBe("#c00000");
  });

  it("ignores transparent pixels when picking a dominant", () => {
    const data = pixels(
      [200, 0, 0, 0], // transparent
      [200, 0, 0, 0], // transparent
      [0, 0, 200, 255]
    );
    expect(dominantColorFromImageData(data)).toBe("#0000c0");
  });

  it("quantizes near-identical colors into the same bucket", () => {
    // 200, 205, 208 all quantize to 192 (12 << 4) at 4-bit precision.
    // 50, 52, 55 all quantize to 48 (3 << 4). 30, 32, 33 all
    // quantize to 16 (1 << 4). So the dominant bucket is #c03010.
    const data = pixels([200, 50, 30], [205, 52, 32], [208, 55, 33]);
    expect(dominantColorFromImageData(data)).toBe("#c03010");
  });
});

describe("extractDominantCoverColor", () => {
  // The wrapper never throws and returns null on any failure. We mock
  // the relevant globals to drive success and failure paths.

  let originalImage: typeof Image;
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    originalImage = globalThis.Image;
    originalCreateElement = document.createElement.bind(document);
  });

  afterEach(() => {
    (globalThis as { Image?: typeof Image }).Image = originalImage;
    vi.restoreAllMocks();
  });

  function installImageMock(behavior: "load" | "error"): void {
    class MockImage {
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;
      public crossOrigin = "";
      public _src = "";
      set src(_v: string) {
        this._src = _v;
        // Fire on next microtask so callers can attach handlers first.
        queueMicrotask(() => {
          if (behavior === "load") this.onload?.();
          else this.onerror?.();
        });
      }
    }
    (globalThis as { Image: typeof Image }).Image =
      MockImage as unknown as typeof Image;
  }

  it("returns null when the image fails to load (CORS / 404)", async () => {
    installImageMock("error");
    await expect(extractDominantCoverColor("https://nope.example/cover.jpg"))
      .resolves.toBeNull();
  });

  it("returns null when document.createElement throws", async () => {
    installImageMock("load");
    const spy = vi
      .spyOn(document, "createElement")
      .mockImplementation(() => {
        throw new Error("no canvas");
      });
    await expect(extractDominantCoverColor("https://example.com/cover.jpg"))
      .resolves.toBeNull();
    expect(spy).toHaveBeenCalled();
  });

  it("returns null when getContext returns null (no 2d support)", async () => {
    installImageMock("load");
    vi.spyOn(document, "createElement").mockImplementation(
      ((tag: string) => {
        const el = originalCreateElement(tag);
        // canvas: replace getContext with a no-op null
        if (tag === "canvas") {
          (el as HTMLCanvasElement).getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
        }
        return el;
      }) as typeof document.createElement
    );
    await expect(extractDominantCoverColor("https://example.com/cover.jpg"))
      .resolves.toBeNull();
  });

  it("never throws to the caller on a bad URL", async () => {
    // No mock — jsdom will not fire onload/onerror, but the function
    // must still return a Promise that resolves to null without
    // throwing. We just call it and assert the promise resolves
    // (eventually) to null OR is safe to await.
    installImageMock("error");
    const promise = extractDominantCoverColor("");
    await expect(promise).resolves.toBeNull();
  });
});
