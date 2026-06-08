import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { YearlyChallengeCard } from "@/features/yearly-challenge/YearlyChallengeCard";
import type { Book } from "@/types/book";
import type { AnnualReadingChallenge } from "@/types/challenge";

/**
 * Mid-year date used to derive the current local year. June
 * 15, 2026 — the same anchor the model helper tests use, so
 * the pace math is consistent across both suites (spec 018
 * §9 "Year changes" — inject `now` for determinism).
 */
const NOW = new Date(2026, 5, 15);

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    title: "Book",
    author: "A",
    status: "read",
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeChallenge(
  overrides: Partial<AnnualReadingChallenge> = {}
): AnnualReadingChallenge {
  return {
    year: 2026,
    targetBooks: 12,
    updatedAt: "2026-06-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("YearlyChallengeCard — setup state (no saved target)", () => {
  it("renders the card with the current year in the title", () => {
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={null}
        isSaving={false}
        error={null}
        onSaveTarget={vi.fn()}
        now={NOW}
      />
    );
    const card = screen.getByTestId("yearly-challenge-card");
    expect(within(card).getByText(/2026/)).toBeInTheDocument();
  });

  it("shows a numeric target input and a save button", () => {
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={null}
        isSaving={false}
        error={null}
        onSaveTarget={vi.fn()}
        now={NOW}
      />
    );
    expect(screen.getByTestId("yearly-challenge-input")).toBeInTheDocument();
    expect(screen.getByTestId("yearly-challenge-save")).toBeInTheDocument();
  });

  it("calls onSaveTarget with the parsed integer on a valid save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={null}
        isSaving={false}
        error={null}
        onSaveTarget={onSave}
        now={NOW}
      />
    );
    await user.clear(screen.getByTestId("yearly-challenge-input"));
    await user.type(screen.getByTestId("yearly-challenge-input"), "12");
    await user.click(screen.getByTestId("yearly-challenge-save"));
    expect(onSave).toHaveBeenCalledWith(12);
  });

  it("rejects an empty input and shows an accessible validation error", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={null}
        isSaving={false}
        error={null}
        onSaveTarget={onSave}
        now={NOW}
      />
    );
    await user.click(screen.getByTestId("yearly-challenge-save"));
    expect(onSave).not.toHaveBeenCalled();
    const validation = screen.getByTestId("yearly-challenge-validation");
    expect(validation).toBeInTheDocument();
    expect(validation).toHaveTextContent(/enter a number/i);
  });

  it("rejects zero with a validation error", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={null}
        isSaving={false}
        error={null}
        onSaveTarget={onSave}
        now={NOW}
      />
    );
    await user.type(screen.getByTestId("yearly-challenge-input"), "0");
    await user.click(screen.getByTestId("yearly-challenge-save"));
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("yearly-challenge-validation")
    ).toBeInTheDocument();
  });

  it("rejects decimal input with a validation error", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={null}
        isSaving={false}
        error={null}
        onSaveTarget={onSave}
        now={NOW}
      />
    );
    await user.type(screen.getByTestId("yearly-challenge-input"), "12.5");
    await user.click(screen.getByTestId("yearly-challenge-save"));
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("yearly-challenge-validation")
    ).toBeInTheDocument();
  });

  it("rejects negative input with a validation error", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={null}
        isSaving={false}
        error={null}
        onSaveTarget={onSave}
        now={NOW}
      />
    );
    await user.type(screen.getByTestId("yearly-challenge-input"), "-3");
    await user.click(screen.getByTestId("yearly-challenge-save"));
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("yearly-challenge-validation")
    ).toBeInTheDocument();
  });

  it("rejects non-numeric input with a validation error", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={null}
        isSaving={false}
        error={null}
        onSaveTarget={onSave}
        now={NOW}
      />
    );
    await user.type(screen.getByTestId("yearly-challenge-input"), "abc");
    await user.click(screen.getByTestId("yearly-challenge-save"));
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("yearly-challenge-validation")
    ).toBeInTheDocument();
  });
});

describe("YearlyChallengeCard — saving state", () => {
  it("disables the save button while a save is in flight", () => {
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={null}
        isSaving={true}
        error={null}
        onSaveTarget={vi.fn()}
        now={NOW}
      />
    );
    expect(screen.getByTestId("yearly-challenge-save")).toBeDisabled();
  });
});

describe("YearlyChallengeCard — save error", () => {
  it("renders the store-supplied error with role='alert'", () => {
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={null}
        isSaving={false}
        error="Could not save your reading goal. Please try again."
        onSaveTarget={vi.fn()}
        now={NOW}
      />
    );
    const error = screen.getByTestId("yearly-challenge-error");
    expect(error).toBeInTheDocument();
    expect(error).toHaveTextContent(/could not save/i);
  });

  it("keeps the previously-saved target visible when a save fails", () => {
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={makeChallenge({ targetBooks: 12 })}
        isSaving={false}
        error="Could not save your reading goal. Please try again."
        onSaveTarget={vi.fn()}
        now={NOW}
      />
    );
    const card = screen.getByTestId("yearly-challenge-card");
    expect(within(card).getByText("12")).toBeInTheDocument();
    expect(
      screen.getByTestId("yearly-challenge-error")
    ).toBeInTheDocument();
  });
});

describe("YearlyChallengeCard — empty state (target saved, no progress)", () => {
  it("shows '0 / target' and an encouraging message", () => {
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={makeChallenge({ targetBooks: 12 })}
        isSaving={false}
        error={null}
        onSaveTarget={vi.fn()}
        now={NOW}
      />
    );
    expect(screen.getByTestId("yearly-challenge-progress")).toHaveTextContent(
      "0 / 12"
    );
    expect(
      screen.getByTestId("yearly-challenge-empty-message")
    ).toBeInTheDocument();
  });
});

describe("YearlyChallengeCard — in-progress state", () => {
  it("shows completed / target, remaining, and a soft pace label", () => {
    const books = Array.from({ length: 5 }, (_, i) =>
      makeBook({ id: `b${i}`, status: "read", finishedAt: "2026-03-15" })
    );
    render(
      <YearlyChallengeCard
        books={books}
        challenge={makeChallenge({ targetBooks: 12 })}
        isSaving={false}
        error={null}
        onSaveTarget={vi.fn()}
        now={NOW}
      />
    );
    expect(screen.getByTestId("yearly-challenge-progress")).toHaveTextContent(
      "5 / 12"
    );
    expect(screen.getByTestId("yearly-challenge-remaining")).toHaveTextContent(
      /7.*to go/i
    );
    expect(screen.getByTestId("yearly-challenge-pace")).toBeInTheDocument();
  });

  it("does not show pace in the empty state", () => {
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={makeChallenge({ targetBooks: 12 })}
        isSaving={false}
        error={null}
        onSaveTarget={vi.fn()}
        now={NOW}
      />
    );
    expect(screen.queryByTestId("yearly-challenge-pace")).not.toBeInTheDocument();
  });

  it("does not show remaining in the complete state", () => {
    const books = Array.from({ length: 12 }, (_, i) =>
      makeBook({ id: `b${i}`, status: "read", finishedAt: "2026-03-15" })
    );
    render(
      <YearlyChallengeCard
        books={books}
        challenge={makeChallenge({ targetBooks: 12 })}
        isSaving={false}
        error={null}
        onSaveTarget={vi.fn()}
        now={NOW}
      />
    );
    expect(
      screen.queryByTestId("yearly-challenge-remaining")
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("yearly-challenge-pace")).not.toBeInTheDocument();
  });
});

describe("YearlyChallengeCard — complete state", () => {
  it("shows a calm completed message when the target is met", () => {
    const books = Array.from({ length: 12 }, (_, i) =>
      makeBook({ id: `b${i}`, status: "read", finishedAt: "2026-03-15" })
    );
    render(
      <YearlyChallengeCard
        books={books}
        challenge={makeChallenge({ targetBooks: 12 })}
        isSaving={false}
        error={null}
        onSaveTarget={vi.fn()}
        now={NOW}
      />
    );
    expect(
      screen.getByTestId("yearly-challenge-complete-message")
    ).toBeInTheDocument();
  });

  it("caps the progress bar at 100% when completed exceeds the target", () => {
    const books = Array.from({ length: 15 }, (_, i) =>
      makeBook({ id: `b${i}`, status: "read", finishedAt: "2026-03-15" })
    );
    render(
      <YearlyChallengeCard
        books={books}
        challenge={makeChallenge({ targetBooks: 10 })}
        isSaving={false}
        error={null}
        onSaveTarget={vi.fn()}
        now={NOW}
      />
    );
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });
});

describe("YearlyChallengeCard — inline editing", () => {
  it("exposes an edit affordance when a target is saved", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <YearlyChallengeCard
        books={[]}
        challenge={makeChallenge({ targetBooks: 12 })}
        isSaving={false}
        error={null}
        onSaveTarget={onSave}
        now={NOW}
      />
    );
    // Hidden by default, revealed on click.
    expect(screen.queryByTestId("yearly-challenge-input")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("yearly-challenge-edit"));
    const input = screen.getByTestId("yearly-challenge-input");
    await user.clear(input);
    await user.type(input, "24");
    await user.click(screen.getByTestId("yearly-challenge-save"));
    expect(onSave).toHaveBeenCalledWith(24);
  });
});
