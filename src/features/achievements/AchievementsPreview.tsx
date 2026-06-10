"use client";

import { useMemo } from "react";
import { useAchievements } from "@/state/achievements";
import {
  ACHIEVEMENT_CATALOG,
  sortUnlocksByRecency,
} from "@/lib/achievements";
import { AchievementCard } from "./AchievementCard";
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
  const retry = useAchievements((s) => s.retry);

  const recent = useMemo(() => {
    const sorted = sortUnlocksByRecency(unlocks);
    return sorted.slice(0, PREVIEW_LIMIT);
  }, [unlocks]);

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
        <button
          type="button"
          onClick={() => void retry()}
          data-testid="achievements-preview-retry"
          className="text-primary mt-2 text-sm underline-offset-2 hover:underline"
        >
          Try again
        </button>
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
      {recent.length === 0 ? (
        <p
          className="text-muted-foreground text-sm"
          data-testid="achievements-preview-empty"
        >
          Keep reading — your milestones will gather here.
        </p>
      ) : (
        <ul className="space-y-2">
          {recent.map((unlock) => {
            const definition = definitionFor(unlock.achievementId);
            if (definition === undefined) return null;
            return (
              <li key={unlock.achievementId}>
                <AchievementCard
                  definition={definition}
                  unlock={unlock}
                  className="px-3 py-3"
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
