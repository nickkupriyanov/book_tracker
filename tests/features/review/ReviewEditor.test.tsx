import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewEditor } from "@/features/review/ReviewEditor";
import type { Review } from "@/types/review";

const { mockError } = vi.hoisted(() => ({
  mockError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: mockError },
}));

describe("ReviewEditor", () => {
  const plainReview: Review = { format: "plain", body: "Hello world" };
  const richReview: Review = {
    format: "rich",
    body: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Rich text" }],
        },
      ],
    },
  };

  beforeEach(() => {
    mockError.mockClear();
  });

  it("mounts with the toolbar and content area", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <ReviewEditor
        initialValue={plainReview}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId("editor-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("review-editor")).toBeInTheDocument();
    expect(screen.getByTestId("review-save-button")).toBeInTheDocument();
    expect(screen.getByTestId("review-cancel-button")).toBeInTheDocument();
  });

  it("shows the initial plain text content in the editor", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <ReviewEditor
        initialValue={plainReview}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId("review-editor").textContent).toContain(
        "Hello world"
      );
    });
  });

  it("calls onSave with { format: 'plain', body } when text is plain", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ReviewEditor
        initialValue={plainReview}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByTestId("review-save-button"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    const saved = onSave.mock.calls[0]?.[0] as Review;
    expect(saved.format).toBe("plain");
    expect(saved.body).toContain("Hello world");
  });

  it("disables save button while saving", async () => {
    let resolveSave: () => void = () => {};
    const onSave = vi.fn().mockImplementation(
      () => new Promise<void>((r) => { resolveSave = r; })
    );
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ReviewEditor
        initialValue={plainReview}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByTestId("review-save-button"));
    expect(screen.getByTestId("review-save-button")).toHaveTextContent(
      "Saving\u2026"
    );
    expect(screen.getByTestId("review-cancel-button")).toBeDisabled();
    resolveSave();
    await waitFor(() => {
      expect(screen.getByTestId("review-save-button")).toHaveTextContent(
        "Save"
      );
    });
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ReviewEditor
        initialValue={plainReview}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByTestId("review-cancel-button"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("toasts on onSave rejection and stays open", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("fail"));
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ReviewEditor
        initialValue={plainReview}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByTestId("review-save-button"));
    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith("Couldn't save review. Try again.");
    });
    expect(screen.getByTestId("review-save-button")).toHaveTextContent("Save");
  });

  it("calls onSave with undefined when the editor is empty (delete flow)", async () => {
    const empty: Review = { format: "plain", body: "" };
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ReviewEditor
        initialValue={empty}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByTestId("review-save-button"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    expect(onSave).toHaveBeenCalledWith(undefined);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("focuses the editor on mount (autofocus: 'end')", async () => {
    render(
      <ReviewEditor
        initialValue={plainReview}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const editorEl = (await screen.findByTestId("review-editor")).querySelector(
      ".tiptap"
    ) as HTMLElement | null;
    expect(editorEl).not.toBeNull();
    await waitFor(() => {
      expect(editorEl).toHaveFocus();
    });
  });

  it("shows the placeholder when the editor is empty", async () => {
    const empty: Review = { format: "plain", body: "" };
    render(
      <ReviewEditor
        initialValue={empty}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const editorEl = await screen.findByTestId("review-editor");
    // Placeholder extension marks the empty paragraph with
    // is-editor-empty and copies its placeholder text into
    // data-placeholder (consumed by our CSS in globals.css).
    await waitFor(() => {
      const emptyP = editorEl.querySelector("p.is-editor-empty");
      expect(emptyP).not.toBeNull();
    });
    const emptyP = editorEl.querySelector("p.is-editor-empty");
    expect(emptyP?.getAttribute("data-placeholder")).toBe("Write your review\u2026");
  });
});
