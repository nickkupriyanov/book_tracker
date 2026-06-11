import { describe, it, expect } from "vitest";
import { formatUnlockDate } from "@/features/achievements/format";

describe("formatUnlockDate", () => {
  it("formats an ISO 8601 timestamp as YYYY-MM-DD in UTC", () => {
    expect(formatUnlockDate("2026-01-10T12:34:56.000Z")).toBe("2026-01-10");
  });

  it("zero-pads single-digit months and days", () => {
    expect(formatUnlockDate("2026-03-05T00:00:00.000Z")).toBe("2026-03-05");
  });

  it("falls back to the raw string on invalid input", () => {
    expect(formatUnlockDate("not-a-date")).toBe("not-a-date");
  });

  it("falls back to the raw string on empty input", () => {
    expect(formatUnlockDate("")).toBe("");
  });
});
