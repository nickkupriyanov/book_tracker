import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewDisplay } from "@/features/review/ReviewDisplay";
import type { Review } from "@/types/review";

describe("ReviewDisplay", () => {
  it("renders 'No review yet.' for undefined", () => {
    render(<ReviewDisplay review={undefined} />);
    expect(screen.getByTestId("review-empty")).toHaveTextContent(
      "No review yet."
    );
  });

  it("renders 'No review yet.' for null", () => {
    render(<ReviewDisplay review={null} />);
    expect(screen.getByTestId("review-empty")).toHaveTextContent(
      "No review yet."
    );
  });

  it("renders a legacy plain string as paragraphs", () => {
    render(<ReviewDisplay review="Great book!" />);
    const para = screen.getByTestId("review-paragraph");
    expect(para).toHaveTextContent("Great book!");
  });

  it("renders { format: 'plain', body } as paragraphs", () => {
    const review: Review = { format: "plain", body: "Loved it." };
    render(<ReviewDisplay review={review} />);
    expect(screen.getByTestId("review-paragraph")).toHaveTextContent(
      "Loved it."
    );
  });

  it("splits plain body on double newlines into multiple paragraphs", () => {
    const review: Review = {
      format: "plain",
      body: "First paragraph.\n\nSecond paragraph.",
    };
    render(<ReviewDisplay review={review} />);
    const paras = screen.getAllByTestId("review-paragraph");
    expect(paras.length).toBe(2);
    expect(paras[0]).toHaveTextContent("First paragraph.");
    expect(paras[1]).toHaveTextContent("Second paragraph.");
  });

  it("renders rich review using the walker", () => {
    const review: Review = {
      format: "rich",
      body: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hello " },
              {
                type: "text",
                marks: [{ type: "bold" }],
                text: "world",
              },
            ],
          },
        ],
      },
    };
    render(<ReviewDisplay review={review} />);
    const rich = screen.getByTestId("review-rich");
    expect(rich.querySelector("strong")?.textContent).toBe("world");
  });

  it("renders a link with allowed scheme as <a target='_blank'>", () => {
    const review: Review = {
      format: "rich",
      body: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [
                  {
                    type: "link",
                    attrs: { href: "https://example.com" },
                  },
                ],
                text: "click",
              },
            ],
          },
        ],
      },
    };
    render(<ReviewDisplay review={review} />);
    const a = screen.getByTestId("review-rich").querySelector("a");
    expect(a).not.toBeNull();
    expect(a?.getAttribute("href")).toBe("https://example.com/");
    expect(a?.getAttribute("target")).toBe("_blank");
    expect(a?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(a?.textContent).toBe("click");
  });

  it("drops a link with javascript: scheme (no <a>, just text)", () => {
    const review: Review = {
      format: "rich",
      body: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [
                  {
                    type: "link",
                    attrs: { href: "javascript:alert(1)" },
                  },
                ],
                text: "bad",
              },
            ],
          },
        ],
      },
    };
    render(<ReviewDisplay review={review} />);
    const rich = screen.getByTestId("review-rich");
    expect(rich.querySelector("a")).toBeNull();
    expect(rich.textContent).toContain("bad");
  });

  it("renders rich review wrapper with the review-prose class for styling", () => {
    const review: Review = {
      format: "rich",
      body: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "x" }],
          },
        ],
      },
    };
    render(<ReviewDisplay review={review} />);
    const rich = screen.getByTestId("review-rich");
    expect(rich.className).toContain("review-prose");
  });

  it("renders bullet list, ordered list and blockquote via the walker", () => {
    const review: Review = {
      format: "rich",
      body: {
        type: "doc",
        content: [
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "first" }],
                  },
                ],
              },
            ],
          },
          {
            type: "orderedList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "second" }],
                  },
                ],
              },
            ],
          },
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "third" }],
              },
            ],
          },
        ],
      },
    };
    render(<ReviewDisplay review={review} />);
    const rich = screen.getByTestId("review-rich");
    expect(rich.querySelector("ul")?.querySelector("li")?.textContent).toBe(
      "first"
    );
    expect(rich.querySelector("ol")?.querySelector("li")?.textContent).toBe(
      "second"
    );
    expect(rich.querySelector("blockquote")?.textContent).toContain("third");
  });
});
