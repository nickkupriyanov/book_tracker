"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAchievementIcon } from "./icons";
import { formatUnlockDate } from "./format";
import type {
  AchievementDefinition,
  AchievementUnlock,
} from "@/types/achievement";

export interface AchievementCardProps {
  definition: AchievementDefinition;
  unlock?: AchievementUnlock;
  className?: string;
}

export function AchievementCard({
  definition,
  unlock,
  className,
}: AchievementCardProps) {
  const { Icon } = getAchievementIcon(definition.icon);
  if (unlock !== undefined) {
    return (
      <UnlockedCard
        Icon={Icon}
        definition={definition}
        unlock={unlock}
        className={className}
      />
    );
  }
  if (definition.secret) {
    return (
      <SecretLockedCard
        Icon={Icon}
        definition={definition}
        className={className}
      />
    );
  }
  return (
    <VisibleLockedCard
      Icon={Icon}
      definition={definition}
      className={className}
    />
  );
}

interface IconCardBaseProps {
  Icon: typeof Lock;
  definition: AchievementDefinition;
  className?: string;
}

function UnlockedCard({
  Icon,
  definition,
  unlock,
  className,
}: IconCardBaseProps & { unlock: AchievementUnlock }) {
  return (
    <article
      data-testid="achievement-card"
      data-achievement-id={definition.id}
      data-achievement-state="unlocked"
      aria-label={`${definition.title} — unlocked`}
      className={cn(
        "bg-card border-border relative flex h-full flex-col gap-2 rounded-lg border px-4 py-4 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-serif text-base text-foreground">
            {definition.title}
          </h3>
          <p className="text-muted-foreground text-xs">
            Unlocked {formatUnlockDate(unlock.unlockedAt)}
          </p>
        </div>
      </div>
      <p className="text-muted-foreground text-sm">{definition.description}</p>
    </article>
  );
}

function VisibleLockedCard({
  Icon,
  definition,
  className,
}: IconCardBaseProps) {
  return (
    <article
      data-testid="achievement-card"
      data-achievement-id={definition.id}
      data-achievement-state="locked-visible"
      aria-label={`${definition.title} — locked`}
      className={cn(
        "bg-card/40 text-muted-foreground border-border/70 relative flex h-full flex-col gap-2 rounded-lg border border-dashed px-4 py-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full"
        >
          <Icon className="size-5" />
        </span>
        <h3 className="font-serif text-base text-foreground">
          {definition.title}
        </h3>
      </div>
      <p className="text-sm">{definition.condition}</p>
    </article>
  );
}

function SecretLockedCard({
  Icon,
  definition,
  className,
}: IconCardBaseProps) {
  return (
    <article
      data-testid="achievement-card"
      data-achievement-id={definition.id}
      data-achievement-state="locked-secret"
      aria-label="Hidden achievement"
      className={cn(
        "bg-card/30 text-muted-foreground border-border/60 relative flex h-full flex-col gap-2 rounded-lg border border-dashed px-4 py-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-muted text-muted-foreground/60 flex size-10 items-center justify-center rounded-full"
        >
          <Icon className="size-5 opacity-50" />
        </span>
        <h3 className="font-serif text-base text-foreground/70">
          Hidden achievement
        </h3>
      </div>
      <p className="text-sm">Keep reading to discover this one.</p>
      <p className="sr-only">Hidden achievement. Keep reading to discover this one.</p>
    </article>
  );
}
