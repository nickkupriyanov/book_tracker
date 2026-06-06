import { describe, it, expect } from "vitest";
import { formatReadingDuration } from "./reading-duration";

describe("formatReadingDuration", () => {
  it('returns "a day" when the two dates are the same day', () => {
    expect(formatReadingDuration("2026-04-01", "2026-04-01")).toBe("a day");
  });

  it('returns "a day" for a 1-day difference', () => {
    expect(formatReadingDuration("2026-04-01", "2026-04-02")).toBe("a day");
  });

  it("returns the day count for 2-7 day differences", () => {
    expect(formatReadingDuration("2026-04-01", "2026-04-03")).toBe("2 days");
    expect(formatReadingDuration("2026-04-01", "2026-04-07")).toBe("6 days");
    expect(formatReadingDuration("2026-04-01", "2026-04-08")).toBe("7 days");
  });

  it("returns whole weeks for 8-30 day differences (rounded down, singular at 1)", () => {
    expect(formatReadingDuration("2026-04-01", "2026-04-09")).toBe("1 week");
    expect(formatReadingDuration("2026-04-01", "2026-04-15")).toBe("2 weeks");
    expect(formatReadingDuration("2026-04-01", "2026-04-29")).toBe("4 weeks");
  });

  it("returns whole months for 31+ day differences (rounded to nearest, singular at 1)", () => {
    // 31 days / 30.4375 = 1.018 → 1 month
    expect(formatReadingDuration("2026-01-01", "2026-02-01")).toBe("1 month");
    // 365 days / 30.4375 = 11.99 → 12 months
    expect(formatReadingDuration("2025-06-15", "2026-06-15")).toBe("12 months");
    // 400 days / 30.4375 = 13.14 → 13 months (rounds up)
    expect(formatReadingDuration("2025-01-01", "2026-02-05")).toBe("13 months");
  });
});

