"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { buildYearlyChallenge } from "@/lib/yearly-reading-challenge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Book } from "@/types/book";
import type { AnnualReadingChallenge } from "@/types/challenge";

export interface YearlyChallengeCardProps {
  /** Current library — same `Book[]` rendered by the home rail. */
  books: Book[];
  /** Saved challenge for the current year, or `null` when none. */
  challenge: AnnualReadingChallenge | null;
  /** `true` while a save is in flight; disables the save button. */
  isSaving: boolean;
  /** Accessible inline error from the last failed save, or `null`. */
  error: string | null;
  /**
   * Persist a new target. The card has already validated the
   * input as a positive whole number; the store layer is
   * expected to write through the `StorageAdapter` (spec 018
   * FR-4). The store sets `isSaving` while the call is in
   * flight and surfaces any failure through `error`.
   */
  onSaveTarget(targetBooks: number): Promise<void>;
  /**
   * Optional "now" injected for tests. Production callers
   * should leave this unset so the year and pace math anchor
   * to real local time.
   */
  now?: Date;
}

/**
 * Cozy library-slip card for the yearly reading challenge
 * (spec 018). Visual direction is **Bookmark warmth** — paper
 * tones, soft borders, generous spacing, a serif heading, a
 * quiet progress bar, and inline target editing so the user
 * never has to leave the right rail.
 *
 * The card derives the display model from `books` and
 * `challenge` via the pure helper; it never persists anything
 * itself, never talks to the store directly, and never
 * mutates books.
 */
export function YearlyChallengeCard({
  books,
  challenge,
  isSaving,
  error,
  onSaveTarget,
  now,
}: YearlyChallengeCardProps) {
  const model = useMemo(
    () => buildYearlyChallenge(books, challenge, now ? { now } : {}),
    [books, challenge, now]
  );

  const [isEditing, setIsEditing] = useState(model.state === "setup");
  const [draft, setDraft] = useState<string>(() =>
    challenge?.targetBooks !== undefined ? String(challenge.targetBooks) : ""
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const errorId = useId();
  const inputId = useId();

  // Keep the draft in sync with the saved target when the
  // store updates (e.g. after a successful save). We avoid
  // resetting the user's in-flight edits by only syncing when
  // the saved value actually changes.
  useEffect(() => {
    if (challenge?.targetBooks !== undefined) {
      setDraft(String(challenge.targetBooks));
    }
  }, [challenge?.targetBooks]);

  // Auto-collapse the edit form once a save succeeds (the
  // store updates `challenge`, the model leaves the `setup`
  // state, and the display takes over). The setup state
  // re-opens the form on its own.
  useEffect(() => {
    if (model.state === "setup") {
      setIsEditing(true);
      return;
    }
    if (!isSaving && !error) {
      setIsEditing(false);
    }
  }, [model.state, isSaving, error]);

  const inputErrorId = `${inputId}-error`;
  const inputAriaProps =
    validationError !== null
      ? { "aria-invalid": true, "aria-describedby": inputErrorId }
      : { "aria-describedby": inputErrorId };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTargetInput(draft);
    if (!result.ok) {
      setValidationError(result.message);
      return;
    }
    setValidationError(null);
    void onSaveTarget(result.value);
  }

  function handleDraftChange(event: React.ChangeEvent<HTMLInputElement>) {
    setDraft(event.target.value);
    if (validationError !== null) setValidationError(null);
  }

  function handleEditClick() {
    setValidationError(null);
    if (challenge?.targetBooks !== undefined) {
      setDraft(String(challenge.targetBooks));
    }
    setIsEditing(true);
  }

  function handleCancel() {
    setValidationError(null);
    if (challenge?.targetBooks !== undefined) {
      setDraft(String(challenge.targetBooks));
    }
    setIsEditing(false);
  }

  return (
    <section
      aria-label={`Yearly reading challenge ${model.year}`}
      data-testid="yearly-challenge-card"
      className="relative mb-6 overflow-hidden rounded-lg border border-border bg-card px-5 py-4 text-card-foreground shadow-sm"
    >
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-base text-foreground">
          Reading Challenge
        </h2>
        <span
          className="text-muted-foreground text-xs tabular-nums"
          data-testid="yearly-challenge-year"
        >
          {model.year}
        </span>
      </header>

      {model.state !== "setup" && (
        <ProgressBlock
          model={model}
          canEdit={!isEditing}
          onEditClick={handleEditClick}
        />
      )}

      {(model.state === "setup" || isEditing) && (
        <form className="mt-3" onSubmit={handleSubmit} noValidate>
          <div className="flex items-center gap-2">
            <label
              htmlFor={inputId}
              className="text-muted-foreground text-xs"
            >
              Goal
            </label>
            <Input
              id={inputId}
              data-testid="yearly-challenge-input"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={draft}
              onChange={handleDraftChange}
              disabled={isSaving}
              className="h-8 min-w-0 flex-1 text-sm"
              {...inputAriaProps}
            />
            <Button
              type="submit"
              data-testid="yearly-challenge-save"
              size="sm"
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
            {model.state !== "setup" && !isSaving && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleCancel}
                aria-label="Cancel editing goal"
                data-testid="yearly-challenge-cancel"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
          {validationError !== null && (
            <p
              id={inputErrorId}
              data-testid="yearly-challenge-validation"
              role="alert"
              className="text-destructive mt-2 text-xs"
            >
              {validationError}
            </p>
          )}
        </form>
      )}

      {error !== null && (
        <p
          data-testid="yearly-challenge-error"
          id={errorId}
          role="alert"
          className="text-destructive mt-2 text-xs"
        >
          {error}
        </p>
      )}
    </section>
  );
}

interface ProgressBlockProps {
  model: ReturnType<typeof buildYearlyChallenge>;
  canEdit: boolean;
  onEditClick(): void;
}

function ProgressBlock({ model, canEdit, onEditClick }: ProgressBlockProps) {
  const target = model.target ?? 0;
  return (
    <div className="mt-3">
      <p
        data-testid="yearly-challenge-progress"
        className="font-serif text-2xl leading-none text-foreground tabular-nums"
      >
        <span>{model.completed}</span>
        <span className="text-muted-foreground"> / </span>
        <span>{target}</span>
        <span className="text-muted-foreground ml-1.5 align-baseline text-xs font-sans">
          books
        </span>
      </p>

      <div
        role="progressbar"
        aria-label="Yearly reading progress"
        aria-valuenow={model.progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="bg-secondary mt-2 h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          data-testid="yearly-challenge-bar"
          className="bg-primary h-full rounded-full transition-[width]"
          style={{ width: `${model.progressPercent}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {model.state === "complete" ? (
          <CompleteCopy model={model} />
        ) : (
          <RemainingCopy model={model} />
        )}
        {model.pace !== null && <PaceLabel pace={model.pace} />}
      </div>

      {canEdit && (
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEditClick}
            data-testid="yearly-challenge-edit"
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3.5" />
            Edit goal
          </Button>
        </div>
      )}
    </div>
  );
}

function RemainingCopy({ model }: { model: ProgressBlockProps["model"] }) {
  if (model.state === "empty") {
    return (
      <p
        data-testid="yearly-challenge-empty-message"
        className="text-muted-foreground"
      >
        Every year begins with a single book.
      </p>
    );
  }
  if (model.remaining === null) return null;
  return (
    <span
      data-testid="yearly-challenge-remaining"
      className="text-muted-foreground"
    >
      <span className="text-foreground font-medium">{model.remaining}</span>{" "}
      to go
    </span>
  );
}

function CompleteCopy({ model }: { model: ProgressBlockProps["model"] }) {
  if (model.isExceeded) {
    return (
      <p
        data-testid="yearly-challenge-complete-message"
        className="text-muted-foreground inline-flex items-center gap-1"
      >
        <Check className="text-primary size-3.5" aria-hidden />
        Beyond your goal — {model.completed} books this year.
      </p>
    );
  }
  return (
    <p
      data-testid="yearly-challenge-complete-message"
      className="text-muted-foreground inline-flex items-center gap-1"
    >
      <Check className="text-primary size-3.5" aria-hidden />
      Goal complete for {model.year}.
    </p>
  );
}

const PACE_LABEL: Record<"ahead" | "on" | "behind", string> = {
  ahead: "Ahead of pace",
  on: "On pace",
  behind: "A little behind",
};

function PaceLabel({ pace }: { pace: "ahead" | "on" | "behind" }) {
  return (
    <span
      data-testid="yearly-challenge-pace"
      className={cn("text-muted-foreground", pace === "behind" && "italic")}
    >
      {PACE_LABEL[pace]}
    </span>
  );
}

type ValidationResult =
  | { ok: true; value: number }
  | { ok: false; message: string };

/**
 * Defensive target-input parser (spec 018 FR-13). Accepts a
 * string and returns either a positive integer or a friendly
 * inline error message. Rejects empty, non-numeric, decimal,
 * negative, and zero inputs — exactly the cases the spec
 * lists. The card surfaces the message in a `role="alert"`
 * element linked to the input via `aria-describedby`.
 */
function validateTargetInput(raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: false, message: "Enter a number to set your goal." };
  }
  if (!/^[0-9]+$/.test(trimmed)) {
    return { ok: false, message: "Enter a whole number greater than zero." };
  }
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(value) || value <= 0) {
    return { ok: false, message: "Enter a whole number greater than zero." };
  }
  return { ok: true, value };
}
