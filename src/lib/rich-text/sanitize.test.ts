import { describe, it, expect } from "vitest";
import { sanitizeHref } from "./sanitize";

describe("sanitizeHref", () => {
  it("allows http:// URLs", () => {
    expect(sanitizeHref("http://example.com")).toBe("http://example.com/");
  });

  it("allows https:// URLs", () => {
    expect(sanitizeHref("https://example.com/path?q=1")).toBe(
      "https://example.com/path?q=1"
    );
  });

  it("allows mailto: URLs", () => {
    expect(sanitizeHref("mailto:a@b.com")).toBe("mailto:a@b.com");
  });

  it("rejects javascript: scheme", () => {
    expect(sanitizeHref("javascript:alert(1)")).toBeUndefined();
  });

  it("rejects data: scheme", () => {
    expect(sanitizeHref("data:text/html,<script>alert(1)</script>")).toBeUndefined();
  });

  it("rejects file: scheme", () => {
    expect(sanitizeHref("file:///etc/passwd")).toBeUndefined();
  });

  it("rejects vbscript: scheme", () => {
    expect(sanitizeHref("vbscript:msgbox(1)")).toBeUndefined();
  });

  it("rejects malformed URLs", () => {
    expect(sanitizeHref("not a url at all ://")).toBeUndefined();
  });
});
