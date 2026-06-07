import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PageContainerWidth = "narrow" | "wide";

export interface PageContainerProps {
  children: ReactNode;
  /**
   * Outer max-width rhythm. `narrow` matches the detail-page
   * reading width (`max-w-3xl`); `wide` gives the home page
   * room for the shelf + reading-calendar rail on desktop
   * (`max-w-6xl`).
   */
  width?: PageContainerWidth;
  /**
   * Optional extra className appended to the shared rhythm.
   * Use sparingly — most layout differences should come from
   * the `width` prop, not from overriding the wrapper.
   */
  className?: string;
}

const widthClass: Record<PageContainerWidth, string> = {
  narrow: "max-w-3xl",
  wide: "max-w-6xl",
};

/**
 * Shared outer page rhythm for the home and book detail pages
 * (spec 014). Centralises the `data-testid="page-container"`
 * testid plus the consistent horizontal/vertical padding and
 * constrained max-width so the two surfaces feel like one app.
 */
export function PageContainer({
  children,
  width = "narrow",
  className,
}: PageContainerProps) {
  return (
    <main
      data-testid="page-container"
      className={cn(
        "mx-auto w-full px-4 py-8 sm:px-6",
        widthClass[width],
        className
      )}
    >
      {children}
    </main>
  );
}
