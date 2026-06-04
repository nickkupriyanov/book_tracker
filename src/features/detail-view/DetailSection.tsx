import type { ReactNode } from "react";

export interface DetailSectionProps {
  title: string;
  children: ReactNode;
}

/**
 * A presentational wrapper for a single section of the detail
 * page. Renders a `<section>` with an `<h2>` heading and the
 * children below. Pure layout primitive — no store, no router.
 *
 * Used by future specs (rating, review, quotes, reading time)
 * to add their own sections without reworking the page layout
 * (spec 005 D7).
 */
export function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <section>
      <h2 className="text-muted-foreground font-serif text-lg">{title}</h2>
      {children}
    </section>
  );
}
