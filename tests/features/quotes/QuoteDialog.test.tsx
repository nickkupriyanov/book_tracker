import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteDialog } from "@/features/quotes/QuoteDialog";
import type { QuoteInput } from "@/types/quote";

const { mockSuccess, mockError } = vi.hoisted(() => ({
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockSuccess,
    error: mockError,
  },
}));

describe("QuoteDialog", () => {
  beforeEach(() => {
    mockSuccess.mockClear();
    mockError.mockClear();
  });

  function renderDialog(props: {
    initialValue?: QuoteInput;
    onSave?: ReturnType<typeof vi.fn>;
  } = {}) {
    const onOpenChange = vi.fn();
    const onSave = props.onSave ?? vi.fn().mockResolvedValue(undefined);
    const utils = render(
      <QuoteDialog
        open={true}
        onOpenChange={onOpenChange}
        {...(props.initialValue !== undefined
          ? { initialValue: props.initialValue }
          : {})}
        onSave={onSave}
      />
    );
    return { ...utils, onOpenChange, onSave };
  }

  it("renders an empty form in add mode", async () => {
    renderDialog();
    await screen.findByRole("dialog");
    expect(screen.getByLabelText("Quote")).toHaveValue("");
    // `type="number"` inputs report `.value` differently across
    // browser / jsdom; read the property directly to avoid the
    // cross-input-type quirks of `toHaveValue` on a number input.
    const pageInput = screen.getByLabelText(
      "Page (optional)"
    ) as HTMLInputElement;
    expect(pageInput.value).toBe("");
    expect(screen.getByLabelText("Note (optional)")).toHaveValue("");
    expect(
      screen.getByRole("heading", { name: "Add quote" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save" })
    ).toBeInTheDocument();
  });

  it("renders a pre-filled form in edit mode", async () => {
    const initial: QuoteInput = {
      text: "Existing passage.",
      page: 42,
      note: "Old note.",
    };
    renderDialog({ initialValue: initial });
    await screen.findByRole("dialog");
    expect(screen.getByLabelText("Quote")).toHaveValue("Existing passage.");
    const pageInput = screen.getByLabelText(
      "Page (optional)"
    ) as HTMLInputElement;
    expect(pageInput.value).toBe("42");
    expect(screen.getByLabelText("Note (optional)")).toHaveValue("Old note.");
    expect(
      screen.getByRole("heading", { name: "Edit quote" })
    ).toBeInTheDocument();
  });

  it("shows an inline error and does not call onSave when text is empty", async () => {
    const { onSave } = renderDialog();
    await screen.findByRole("dialog");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByTestId("quote-error-text")
    ).toHaveTextContent(/required/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows an inline error and does not call onSave when page is not an integer", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderDialog({ onSave });
    await screen.findByRole("dialog");
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Quote"), "A passage.");
    await user.type(screen.getByLabelText("Page (optional)"), "42.5");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByTestId("quote-error-page")
    ).toHaveTextContent(/whole number/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with the normalised input and closes the dialog on a valid save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { onOpenChange } = renderDialog({ onSave });
    await screen.findByRole("dialog");
    const user = userEvent.setup();

    await user.type(
      screen.getByLabelText("Quote"),
      "  A passage to remember.  "
    );
    await user.type(screen.getByLabelText("Page (optional)"), "42");
    await user.type(screen.getByLabelText("Note (optional)"), "  struck me.  ");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        text: "A passage to remember.",
        page: 42,
        note: "struck me.",
      });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockError).not.toHaveBeenCalled();
  });

  it("treats blank page and blank note as absent (no key on the payload)", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderDialog({ onSave });
    await screen.findByRole("dialog");
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Quote"), "Just text.");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ text: "Just text." });
    });
  });

  it("toasts and stays open when onSave rejects", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("storage down"));
    const { onOpenChange } = renderDialog({ onSave });
    await screen.findByRole("dialog");
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Quote"), "A passage.");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Couldn't save quote. Try again."
      );
    });
    // Dialog must stay open — the parent's onOpenChange(false) is not
    // fired when onSave throws.
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    // The user's input is preserved.
    expect(screen.getByLabelText("Quote")).toHaveValue("A passage.");
  });

  it("Cancel closes the dialog without calling onSave", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { onOpenChange } = renderDialog({ onSave });
    await screen.findByRole("dialog");
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Quote"), "A passage.");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSave).not.toHaveBeenCalled();
  });
});
