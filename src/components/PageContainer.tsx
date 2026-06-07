import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps {
  children: ReactNode;
  /**
   * Optional extra className appended to the shared rhythm.
   * Use sparingly — page-level width and spacing should stay
   * shared between home and detail pages.
   */
  className?: string;
}

/**
 * Shared outer page rhythm for the home and book detail pages
 * (spec 014). Centralises the `data-testid="page-container"`
 * testid plus the consistent horizontal/vertical padding and
 * constrained max-width so the two surfaces feel like one app.
 */
export function PageContainer({
  children,
  className,
}: PageContainerProps) {
  return (
    <main
      data-testid="page-container"
      className={cn(
        "mx-auto w-full max-w-6xl px-4 py-8 sm:px-6",
        className
      )}
    >
      {children}
    </main>
  );
}
