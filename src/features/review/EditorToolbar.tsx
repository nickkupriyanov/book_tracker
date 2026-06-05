"use client";

import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { Toggle } from "@/components/ui/toggle";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  Quote,
  Link,
} from "lucide-react";
import { sanitizeHref } from "@/lib/rich-text/sanitize";

export interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      isBold: e?.isActive("bold") ?? false,
      isItalic: e?.isActive("italic") ?? false,
      isUnderline: e?.isActive("underline") ?? false,
      isStrike: e?.isActive("strike") ?? false,
      isHighlight: e?.isActive("highlight") ?? false,
      isBulletList: e?.isActive("bulletList") ?? false,
      isOrderedList: e?.isActive("orderedList") ?? false,
      isBlockquote: e?.isActive("blockquote") ?? false,
      isLink: e?.isActive("link") ?? false,
    }),
  });
  const { isBold, isItalic, isUnderline, isStrike, isHighlight, isBulletList, isOrderedList, isBlockquote, isLink } =
    state ?? {
      isBold: false,
      isItalic: false,
      isUnderline: false,
      isStrike: false,
      isHighlight: false,
      isBulletList: false,
      isOrderedList: false,
      isBlockquote: false,
      isLink: false,
    };

  function handleLink(): void {
    if (!editor) return;
    if (isLink) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const href = window.prompt("Enter link URL:");
    if (href === null) return;
    const safe = sanitizeHref(href);
    if (!safe) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: safe }).run();
  }

  return (
    <div className="flex flex-wrap gap-1" data-testid="editor-toolbar">
      <Toggle
        size="sm"
        pressed={isBold}
        onPressedChange={() => editor?.chain().focus().toggleBold().run()}
        aria-label="Bold"
        title="Bold (Cmd+B)"
        disabled={!editor}
      >
        <Bold />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isItalic}
        onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
        aria-label="Italic"
        title="Italic (Cmd+I)"
        disabled={!editor}
      >
        <Italic />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isUnderline}
        onPressedChange={() => editor?.chain().focus().toggleUnderline().run()}
        aria-label="Underline"
        title="Underline (Cmd+U)"
        disabled={!editor}
      >
        <Underline />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isStrike}
        onPressedChange={() => editor?.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
        title="Strikethrough"
        disabled={!editor}
      >
        <Strikethrough />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isHighlight}
        onPressedChange={() => editor?.chain().focus().toggleHighlight().run()}
        aria-label="Highlight"
        title="Highlight"
        disabled={!editor}
      >
        <Highlighter />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isBulletList}
        onPressedChange={() => editor?.chain().focus().toggleBulletList().run()}
        aria-label="Bullet list"
        title="Bullet list"
        disabled={!editor}
      >
        <List />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isOrderedList}
        onPressedChange={() => editor?.chain().focus().toggleOrderedList().run()}
        aria-label="Ordered list"
        title="Ordered list"
        disabled={!editor}
      >
        <ListOrdered />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isBlockquote}
        onPressedChange={() => editor?.chain().focus().toggleBlockquote().run()}
        aria-label="Blockquote"
        title="Blockquote"
        disabled={!editor}
      >
        <Quote />
      </Toggle>
      <Toggle
        size="sm"
        pressed={isLink}
        onPressedChange={handleLink}
        aria-label={isLink ? "Remove link" : "Add link"}
        title={isLink ? "Remove link" : "Add link"}
        disabled={!editor}
      >
        <Link />
      </Toggle>
    </div>
  );
}
