"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { EditorToolbar } from "./EditorToolbar";
import { richTextExtensions } from "@/lib/rich-text/schema";
import { validateReview } from "@/lib/validation/book";
import type { Review } from "@/types/review";
import type { JSONContent } from "@tiptap/core";

export interface ReviewEditorProps {
  initialValue: Review;
  onSave: (review: Review | undefined) => Promise<void>;
  onCancel: () => void;
}

function reviewToEditorContent(review: Review): JSONContent | string {
  if (review.format === "rich") return review.body;
  return review.body;
}

function isPlainDoc(doc: JSONContent): boolean {
  if (!Array.isArray(doc.content)) return true;
  if (doc.content.length === 0) return true;
  if (doc.content.length > 1) return false;
  const first = doc.content[0];
  if (!first || first.type !== "paragraph") return false;
  if (!first.content || first.content.length === 0) return true;
  return first.content.every(
    (n) => n.type === "text" && (!n.marks || n.marks.length === 0)
  );
}

export function ReviewEditor({
  initialValue,
  onSave,
  onCancel,
}: ReviewEditorProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: richTextExtensions,
    content: reviewToEditorContent(initialValue),
    immediatelyRender: false,
    autofocus: "end",
  });

  async function handleSave(): Promise<void> {
    if (!editor) return;
    const doc = editor.getJSON();
    const plainText = editor.getText().trim();

    let review: Review | undefined;
    if (plainText.length === 0) {
      review = undefined;
    } else if (isPlainDoc(doc)) {
      review = { format: "plain", body: plainText };
    } else {
      review = { format: "rich", body: doc };
    }

    if (review !== undefined) {
      const validationErrors: Record<string, string> = {};
      const result = validateReview(review, validationErrors);
      if (!result) {
        setErrors(validationErrors);
        return;
      }
      review = result;
    }

    setIsSaving(true);
    setErrors({});
    try {
      await onSave(review);
    } catch {
      toast.error("Couldn't save review. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <EditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        data-testid="review-editor"
        className="border border-input rounded-md p-3 min-h-32 w-full focus:outline-none [&_p]:my-2"
      />
      {errors.review && (
        <p
          role="alert"
          className="text-sm text-destructive"
          data-testid="review-error"
        >
          {errors.review}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
          data-testid="review-cancel-button"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            void handleSave();
          }}
          disabled={isSaving || editor === null}
          data-testid="review-save-button"
        >
          {isSaving ? "Saving\u2026" : "Save"}
        </Button>
      </div>
    </div>
  );
}
