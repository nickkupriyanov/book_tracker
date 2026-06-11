"use client";

import { useMemo } from "react";
import { useAchievements } from "@/state/achievements";
import {
  ACHIEVEMENT_CATALOG,
  groupAchievements,
} from "@/lib/achievements";
import { AchievementCard } from "./AchievementCard";
import { Button } from "@/components/ui/button";
import type {
  AchievementDefinition,
  AchievementUnlock,
} from "@/types/achievement";

const DEFINITION_BY_ID: Map<
  AchievementDefinition["id"],
  AchievementDefinition
> = new Map(ACHIEVEMENT_CATALOG.map((entry) => [entry.id, entry]));

function definitionFor(id: AchievementUnlock["achievementId"]) {
  return DEFINITION_BY_ID.get(id);
}

/**
 * `/achievements` page surface (spec 024 §5.2, FR-12).
 *
 * The store owns status, load state, and error copy. This
 * client renders every state:
 *  - loading  -> quiet progress copy
 *  - error    -> retryable inline error
 *  - ready    -> unlocked, visible-locked, and secret-locked
 *                groups in spec order; an unlocked-empty
 *                sub-state is allowed and renders the locked
 *                catalog alone.
 *
 * No progress bars, no celebratory animation, no
 * category filters — every visual element is keyed to a
 * catalog definition and never reveals a secret's title
 * before its unlock.
 */
export function AchievementsClient() {
  const status = useAchievements((s) => s.status);
  const unlocks = useAchievements((s) => s.unlocks);
  const error = useAchievements((s) => s.error);
  const retry = useAchievements((s) => s.retry);

  const groups = useMemo(() => groupAchievements(unlocks), [unlocks]);

  if (status === "loading") {
    return (
      <main
        aria-label="Achievements"
        data-testid="achievements-page"
        data-state="loading"
        className="mx-auto max-w-3xl px-4 py-10"
      >
        <p className="text-muted-foreground">Loading your achievements…</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main
        aria-label="Achievements"
        data-testid="achievements-page"
        data-state="error"
        className="mx-auto max-w-3xl px-4 py-10"
      >
        <header className="mb-6">
          <h1 className="font-serif text-2xl text-foreground">Achievements</h1>
          <p className="text-muted-foreground text-sm">
            Milestones from your reading life.
          </p>
        </header>
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => void retry()}
          data-testid="achievements-retry"
          className="mt-2 px-0"
        >
          Try again
        </Button>
      </main>
    );
  }

  return (
    <main
      aria-label="Achievements"
      data-testid="achievements-page"
      data-state="ready"
      className="mx-auto max-w-3xl px-4 py-10"
    >
      <header className="mb-6">
        <h1 className="font-serif text-2xl text-foreground">Achievements</h1>
        <p className="text-muted-foreground text-sm">
          Milestones from your reading life.
        </p>
      </header>

      {groups.unlocked.length > 0 ? (
        <section
          aria-label="Unlocked"
          data-testid="achievements-section"
          data-section="unlocked"
          className="mb-8"
        >
          <h2 className="font-serif text-muted-foreground mb-3 text-sm uppercase tracking-wide">
            Unlocked
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {groups.unlocked.map((unlock) => {
              const definition = definitionFor(unlock.achievementId);
              if (definition === undefined) return null;
              return (
                <li key={unlock.achievementId}>
                  <AchievementCard definition={definition} unlock={unlock} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p
          data-testid="achievements-empty"
          className="text-muted-foreground mb-8 text-sm"
        >
          No achievements yet. Keep reading — your first milestone is close.
        </p>
      )}

      {groups.visibleLocked.length > 0 && (
        <section
          aria-label="Locked milestones"
          data-testid="achievements-section"
          data-section="visible-locked"
          className="mb-8"
        >
          <h2 className="font-serif text-muted-foreground mb-3 text-sm uppercase tracking-wide">
            Locked
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {groups.visibleLocked.map((def) => (
              <li key={def.id}>
                <AchievementCard definition={def} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.secretLocked.length > 0 && (
        <section
          aria-label="Hidden milestones"
          data-testid="achievements-section"
          data-section="secret-locked"
        >
          <h2 className="font-serif text-muted-foreground mb-3 text-sm uppercase tracking-wide">
            Hidden
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {groups.secretLocked.map((def) => (
              <li key={def.id}>
                <AchievementCard definition={def} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
