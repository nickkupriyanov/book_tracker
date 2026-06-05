import type { JSONContent } from "@tiptap/core";

export interface PlainReview {
  format: "plain";
  body: string;
}

export interface RichReview {
  format: "rich";
  body: JSONContent;
}

export type Review = PlainReview | RichReview;

export type ReviewInput = Review;
