import { Fragment, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { sanitizeHref } from "./sanitize";

const WARNED_UNKNOWN = new Set<string>();

function warnOnce(type: string): void {
  if (WARNED_UNKNOWN.has(type)) return;
  WARNED_UNKNOWN.add(type);
  if (process.env.NODE_ENV === "development") {
    console.warn(`[walker] Unknown node/mark type dropped: "${type}"`);
  }
}

export function walk(doc: JSONContent): ReactNode {
  if (!doc) return null;
  if (doc.type === "doc" && Array.isArray(doc.content)) {
    return <>{doc.content.map((c, i) => walkNode(c, i))}</>;
  }
  return null;
}

function walkNode(node: JSONContent, key: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{walkChildren(node)}</p>;
    case "bulletList":
      return <ul key={key}>{walkChildren(node)}</ul>;
    case "orderedList":
      return <ol key={key}>{walkChildren(node)}</ol>;
    case "listItem":
      return <li key={key}>{walkChildren(node)}</li>;
    case "blockquote":
      return <blockquote key={key}>{walkChildren(node)}</blockquote>;
    case "hardBreak":
      return <br key={key} />;
    case "text":
      return <Fragment key={key}>{applyMarks(node.text ?? "", node.marks)}</Fragment>;
    default:
      if (node.type) warnOnce(node.type);
      return null;
  }
}

function walkChildren(node: JSONContent): ReactNode {
  if (!Array.isArray(node.content)) return null;
  return <>{node.content.map((c, i) => walkNode(c, i))}</>;
}

type Mark = JSONContent["marks"] extends (infer M)[] | undefined ? M : never;

function applyMarks(text: string, marks?: Mark[]): ReactNode {
  if (!marks || marks.length === 0) return text;

  let result: ReactNode = text;
  for (const mark of marks) {
    result = applyMark(mark, result);
  }
  return result;
}

function applyMark(mark: NonNullable<Mark>, children: ReactNode): ReactNode {
  switch (mark.type) {
    case "bold":
      return <strong>{children}</strong>;
    case "italic":
      return <em>{children}</em>;
    case "underline":
      return <u>{children}</u>;
    case "strike":
      return <s>{children}</s>;
    case "highlight":
      return <mark className="bg-yellow-200/60">{children}</mark>;
    case "link": {
      const href = mark.attrs?.href;
      if (typeof href === "string") {
        const safe = sanitizeHref(href);
        if (safe) {
          return (
            <a href={safe} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          );
        }
      }
      return children;
    }
    default:
      warnOnce(mark.type);
      return children;
  }
}
