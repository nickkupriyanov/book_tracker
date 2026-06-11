"use client";

import { useMemo } from "react";
import { useAchievements } from "@/state/achievements";
import {
  ACHIEVEMENT_CATALOG,
  sortUnlocksByRecency,
} from "@/lib/achievements";
import { Button } from "@/components/ui/button";
import { formatUnlockDate } from "./format";
import { getAchievementIcon } from "./icons";
import type {
  AchievementDefinition,
  AchievementUnlock,
} from "@/types/achievement";

const PREVIEW_LIMIT = 3;

const DEFINITION_BY_ID: Map<AchievementDefinition["id"], AchievementDefinition> =
  new Map(ACHIEVEMENT_CATALOG.map((entry) => [entry.id, entry]));

function definitionFor(id: AchievementUnlock["achievementId"]) {
  return DEFINITION_BY_ID.get(id);
}

/**
 * Read-only model for the home preview card. Selectors
 * already own the derivation, so this component is purely
 * declarative. Errors are surfaced with a calm retry
 * affordance; empty unlocked state shows gentle copy
 * (spec 024 §5.1, FR-11).
 */
export function AchievementsPreview() {
  const status = useAchievements((s) => s.status);
  const unlocks = useAchievements((s) => s.unlocks);
  const error = useAchievements((s) => s.error);
  const pendingUnlocks = useAchievements((s) => s.pendingUnlocks);
  const retry = useAchievements((s) => s.retry);

  const recent = useMemo(() => {
    const sorted = sortUnlocksByRecency(unlocks);
    return sorted.slice(0, PREVIEW_LIMIT);
  }, [unlocks]);
  // Mirror the full collection: surface a calm retry banner
  // when the most recent save failed, while still showing the
  // unlocked list (spec 024 FR-16, FR-17).
  const hasSaveFailure =
    status === "ready" && error !== null && pendingUnlocks.length > 0;

  if (status === "error") {
    return (
      <section
        aria-label="Achievements"
        data-testid="achievements-preview"
        data-state="error"
        className="bg-card text-card-foreground border-border rounded-lg border px-5 py-4 shadow-sm"
      >
        <header className="mb-2 flex items-baseline justify-between">
          <h2 className="font-serif text-base text-foreground">Achievements</h2>
        </header>
        <p className="text-muted-foreground text-sm" role="alert">
          {error}
        </p>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => void retry()}
          data-testid="achievements-preview-retry"
          className="mt-2 px-0"
        >
          Try again
        </Button>
      </section>
    );
  }

  return (
    <section
      aria-label="Achievements"
      data-testid="achievements-preview"
      data-state={recent.length === 0 ? "empty" : "ready"}
      className="bg-card text-card-foreground border-border rounded-lg border px-5 py-4 shadow-sm"
    >
      <header className="mb-2 flex items-baseline justify-between">
        <h2 className="font-serif text-base text-foreground">Achievements</h2>
        <a
          href="/achievements"
          data-testid="achievements-preview-view-all"
          className="text-primary text-sm underline-offset-2 hover:underline"
        >
          View all
        </a>
      </header>
      {hasSaveFailure && (
        <div
          role="alert"
          data-testid="achievements-preview-save-banner"
          className="mb-3 flex flex-wrap items-center gap-2 text-sm"
        >
          <p className="text-muted-foreground flex-1">{error}</p>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => void retry()}
            data-testid="achievements-preview-save-retry"
            aria-label="Retry saving your achievements"
            className="px-0"
          >
            Try again
          </Button>
        </div>
      )}
      {recent.length === 0 ? (
        <p
          className="text-muted-foreground text-sm"
          data-testid="achievements-preview-empty"
        >
          Keep reading — your milestones will gather here.
        </p>
      ) : (
        <ul className="divide-border/60 divide-y">
          {recent.map((unlock) => {
            const definition = definitionFor(unlock.achievementId);
            if (definition === undefined) return null;
            return (
              <li
                key={unlock.achievementId}
                className="py-3 first:pt-1 last:pb-0"
              >
                <AchievementPreviewRow
                  definition={definition}
                  unlock={unlock}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

interface AchievementPreviewRowProps {
  definition: AchievementDefinition;
  unlock: AchievementUnlock;
}

function AchievementPreviewRow({
  definition,
  unlock,
}: AchievementPreviewRowProps) {
  const { Icon } = getAchievementIcon(definition.icon);

  return (
    <article
      aria-label={`${definition.title} — unlocked`}
      data-testid="achievement-preview-row"
      data-achievement-id={definition.id}
      className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3"
    >
      <span
        aria-hidden
        className="bg-primary/10 text-primary row-span-2 flex size-9 items-center justify-center rounded-full"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <h3 className="font-serif text-base leading-tight text-foreground">
          {definition.title}
        </h3>
        <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
          Unlocked {formatUnlockDate(unlock.unlockedAt)}
        </p>
      </div>
      <p className="text-muted-foreground col-start-2 mt-1.5 text-xs leading-relaxed">
        {definition.description}
      </p>
    </article>
  );
}
