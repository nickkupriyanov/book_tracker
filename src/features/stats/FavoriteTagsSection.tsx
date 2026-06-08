"use client";

import type { FavoriteTag } from "@/lib/reader-stats";

export interface FavoriteTagsSectionProps {
  tags: FavoriteTag[];
  /**
   * Maximum number of tags to display. Defaults to the first
   * six so the section stays compact (spec 021 §5).
   */
  limit?: number;
}

/**
 * The favorite-tags section of the Reader Portrait. Renders a
 * compact pill list ordered by `count` desc, then `label` asc
 * (FR-5). When the library carries no tags, renders a gentle
 * empty prompt instead of disappearing (FR-11).
 */
export function FavoriteTagsSection({
  tags,
  limit = 6,
}: FavoriteTagsSectionProps) {
  const visible = tags.slice(0, limit);

  return (
    <section
      aria-label="Favorite tags"
      data-testid="stats-favorite-tags"
      className="rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm"
    >
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg text-foreground">Favorite tags</h2>
        <span
          data-testid="stats-favorite-tags-count"
          className="text-muted-foreground text-xs tabular-nums"
        >
          {tags.length}
        </span>
      </header>

      {visible.length === 0 ? (
        <p
          data-testid="stats-favorite-tags-empty"
          className="text-muted-foreground text-sm"
        >
          No tags yet — adding a few would help this section bloom.
        </p>
      ) : (
        <ul
          data-testid="stats-favorite-tags-list"
          className="flex flex-wrap gap-2"
        >
          {visible.map((tag) => (
            <li
              key={tag.label}
              data-testid="stats-favorite-tag"
              data-tag-label={tag.label}
              data-tag-count={tag.count}
              className="bg-muted text-foreground inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs"
            >
              <span className="font-medium">{tag.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {tag.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
