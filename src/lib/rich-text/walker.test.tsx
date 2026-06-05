import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { walk } from "./walker";
import type { JSONContent } from "@tiptap/core";

function renderWalk(doc: JSONContent) {
  const result = walk(doc);
  const { container } = render(<>{result}</>);
  return container;
}

describe("walk", () => {
  it("renders nothing for an empty doc", () => {
    const doc: JSONContent = { type: "doc", content: [] };
    const c = renderWalk(doc);
    expect(c.innerHTML).toBe("");
  });

  it("renders a plain text paragraph", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };
    const c = renderWalk(doc);
    const p = c.querySelector("p");
    expect(p).not.toBeNull();
    expect(p?.textContent).toBe("Hello world");
  });

  it("renders bold text inside a paragraph", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "before " },
            {
              type: "text",
              marks: [{ type: "bold" }],
              text: "bold",
            },
            { type: "text", text: " after" },
          ],
        },
      ],
    };
    const c = renderWalk(doc);
    const strong = c.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe("bold");
  });

  it("renders italic text", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "italic" }], text: "italic" },
          ],
        },
      ],
    };
    const c = renderWalk(doc);
    expect(c.querySelector("em")).not.toBeNull();
    expect(c.querySelector("em")?.textContent).toBe("italic");
  });

  it("renders underline text", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "underline" }], text: "under" },
          ],
        },
      ],
    };
    const c = renderWalk(doc);
    expect(c.querySelector("u")).not.toBeNull();
    expect(c.querySelector("u")?.textContent).toBe("under");
  });

  it("renders strikethrough text", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "strike" }], text: "struck" },
          ],
        },
      ],
    };
    const c = renderWalk(doc);
    expect(c.querySelector("s")).not.toBeNull();
    expect(c.querySelector("s")?.textContent).toBe("struck");
  });

  it("renders highlighted text", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "highlight" }],
              text: "hl",
            },
          ],
        },
      ],
    };
    const c = renderWalk(doc);
    expect(c.querySelector("mark")).not.toBeNull();
    expect(c.querySelector("mark")?.textContent).toBe("hl");
  });

  it("renders nested marks (bold + italic)", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "bold" }, { type: "italic" }],
              text: "both",
            },
          ],
        },
      ],
    };
    const c = renderWalk(doc);
    const em = c.querySelector("em");
    expect(em).not.toBeNull();
    expect(em?.querySelector("strong")).not.toBeNull();
    expect(em?.querySelector("strong")?.textContent).toBe("both");
  });

  it("renders a bullet list", () => {
    const doc: JSONContent = {
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
                  content: [{ type: "text", text: "one" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "two" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const c = renderWalk(doc);
    const ul = c.querySelector("ul");
    expect(ul).not.toBeNull();
    expect(ul?.querySelectorAll("li").length).toBe(2);
    expect(ul?.textContent).toContain("one");
    expect(ul?.textContent).toContain("two");
  });

  it("renders an ordered list", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "orderedList",
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
      ],
    };
    const c = renderWalk(doc);
    expect(c.querySelector("ol")).not.toBeNull();
    expect(c.querySelector("ol")?.querySelector("li")).not.toBeNull();
  });

  it("renders a blockquote", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "quoted" }],
            },
          ],
        },
      ],
    };
    const c = renderWalk(doc);
    expect(c.querySelector("blockquote")).not.toBeNull();
    expect(c.querySelector("blockquote")?.textContent).toBe("quoted");
  });

  it("renders a hard break as <br />", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "line1" },
            { type: "hardBreak" },
            { type: "text", text: "line2" },
          ],
        },
      ],
    };
    const c = renderWalk(doc);
    expect(c.querySelector("br")).not.toBeNull();
  });

  it("renders a link with allowed scheme as <a>", () => {
    const doc: JSONContent = {
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
                  attrs: { href: "https://example.com", target: "_blank" },
                },
              ],
              text: "click",
            },
          ],
        },
      ],
    };
    const c = renderWalk(doc);
    const a = c.querySelector("a");
    expect(a).not.toBeNull();
    expect(a?.getAttribute("href")).toBe("https://example.com/");
    expect(a?.getAttribute("target")).toBe("_blank");
    expect(a?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(a?.textContent).toBe("click");
  });

  it("renders a link with javascript: scheme as plain text (no <a>)", () => {
    const doc: JSONContent = {
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
    };
    const c = renderWalk(doc);
    expect(c.querySelector("a")).toBeNull();
    expect(c.textContent).toContain("bad");
  });

  it("drops unknown node types silently", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "before" }] },
        { type: "customUnknown" as JSONContent["type"], content: [] },
        { type: "paragraph", content: [{ type: "text", text: "after" }] },
      ],
    };
    const c = renderWalk(doc);
    const ps = c.querySelectorAll("p");
    expect(ps.length).toBe(2);
    expect(c.textContent).toContain("before");
    expect(c.textContent).toContain("after");
  });

  it("renders multiple paragraphs", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "p1" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "p2" }],
        },
      ],
    };
    const c = renderWalk(doc);
    expect(c.querySelectorAll("p").length).toBe(2);
  });
});
