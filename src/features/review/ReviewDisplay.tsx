"use client";

import { Fragment, type ReactNode } from "react";
import type { Review } from "@/types/review";
import { walk } from "@/lib/rich-text/walker";

export interface ReviewDisplayProps {
  review: Review | string | null | undefined;
}

function renderPlain(body: string): ReactNode {
  const paragraphs = body.split(/\n{2,}/);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="text-foreground whitespace-pre-line"
          data-testid="review-paragraph"
        >
          {p}
        </p>
      ))}
    </>
  );
}

export function ReviewDisplay({ review }: ReviewDisplayProps) {
  if (review === undefined || review === null) {
    return (
      <p
        className="text-muted-foreground text-sm"
        data-testid="review-empty"
      >
        No review yet.
      </p>
    );
  }

  if (typeof review === "string") {
    return <>{renderPlain(review)}</>;
  }

  if (review.format === "plain") {
    return <>{renderPlain(review.body)}</>;
  }

  return (
    <div data-testid="review-rich" className="text-foreground review-prose">
      <Fragment>{walk(review.body)}</Fragment>
    </div>
  );
}
