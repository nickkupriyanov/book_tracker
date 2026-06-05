import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

export const richTextExtensions = [
  StarterKit.configure({
    heading: false,
    codeBlock: false,
    code: false,
    link: false,
    underline: false,
  }),
  Underline,
  Highlight,
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: {
      rel: "noopener noreferrer",
      target: "_blank",
    },
  }),
  Placeholder.configure({
    placeholder: "Write your review\u2026",
  }),
];
