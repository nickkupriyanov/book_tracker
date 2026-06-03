import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddBookDialog } from "@/features/add-book/AddBookDialog";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";
import {
  getLastStatus,
  setLastStatus,
  __resetLastStatus,
} from "@/features/add-book/last-status";

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

describe("AddBookDialog", () => {
  beforeEach(async () => {
    __resetLastStatus();
    __resetBookLibrary();
    localStorage.clear();
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    mockSuccess.mockClear();
    mockError.mockClear();
  });

  function renderDialog(
    props: Partial<React.ComponentProps<typeof AddBookDialog>> = {}
  ) {
    const onOpenChange = vi.fn();
    const utils = render(
      <AddBookDialog open={true} onOpenChange={onOpenChange} {...props} />
    );
    return { ...utils, onOpenChange };
  }

  it("does not render the form when closed", () => {
    render(<AddBookDialog open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the form when open", async () => {
    renderDialog();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Author")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });

  it("initializes status from last-used (D2)", async () => {
    setLastStatus("reading");
    renderDialog();
    await screen.findByRole("dialog");
    // shadcn Select trigger shows the label of the selected item
    expect(screen.getByTestId("add-book-status-trigger")).toHaveTextContent(
      "Reading"
    );
  });

  it("disables submit when title is empty", async () => {
    renderDialog();
    await screen.findByRole("dialog");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Author"), "Susanna Clarke");
    const submit = screen.getByTestId("add-book-submit");
    expect(submit).toBeDisabled();
  });

  it("disables submit when author is empty", async () => {
    renderDialog();
    await screen.findByRole("dialog");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Title"), "Piranesi");
    const submit = screen.getByTestId("add-book-submit");
    expect(submit).toBeDisabled();
  });

  it("enables submit when both required fields are filled", async () => {
    renderDialog();
    await screen.findByRole("dialog");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Title"), "Piranesi");
    await user.type(screen.getByLabelText("Author"), "Susanna Clarke");
    const submit = screen.getByTestId("add-book-submit");
    expect(submit).not.toBeDisabled();
  });

  it("shows validation errors and keeps dialog open on bad cover URL", async () => {
    renderDialog();
    await screen.findByRole("dialog");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Title"), "Piranesi");
    await user.type(screen.getByLabelText("Author"), "Susanna Clarke");
    await user.type(screen.getByLabelText(/cover url/i), "not-a-url");
    await user.click(screen.getByTestId("add-book-submit"));
    await waitFor(() => {
      expect(screen.getByText(/http/i)).toBeInTheDocument();
    });
    // No toast fired
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it("saves a valid book, closes dialog, shows toast, persists to storage", async () => {
    const { onOpenChange } = renderDialog();
    await screen.findByRole("dialog");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Title"), "Piranesi");
    await user.type(screen.getByLabelText("Author"), "Susanna Clarke");
    await user.click(screen.getByTestId("add-book-submit"));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(mockSuccess).toHaveBeenCalledWith('Added "Piranesi"');
    const stored = JSON.parse(
      localStorage.getItem("book-tracker:books") || "[]"
    );
    expect(stored).toHaveLength(1);
    expect(stored[0]?.title).toBe("Piranesi");
    expect(stored[0]?.author).toBe("Susanna Clarke");
  });

  it("writes the chosen status to last-status on success (D2)", async () => {
    const { onOpenChange } = renderDialog();
    await screen.findByRole("dialog");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Title"), "Piranesi");
    await user.type(screen.getByLabelText("Author"), "Susanna Clarke");
    // Change status to "read"
    await user.click(screen.getByLabelText("Status"));
    await user.click(screen.getByRole("option", { name: "Read" }));
    await user.click(screen.getByTestId("add-book-submit"));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(getLastStatus()).toBe("read");
  });

  it("preserves last-used status across dialog reopens", async () => {
    // First open: save with default status ("want")
    const first = renderDialog();
    await screen.findByRole("dialog");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Title"), "First");
    await user.type(screen.getByLabelText("Author"), "Author");
    await user.click(screen.getByTestId("add-book-submit"));
    await waitFor(() => expect(first.onOpenChange).toHaveBeenCalledWith(false));

    // Reopen
    first.rerender(
      <AddBookDialog open={true} onOpenChange={first.onOpenChange} />
    );
    await screen.findByRole("dialog");
    expect(getLastStatus()).toBe("want");
    // Check the trigger specifically (not the option in the dropdown portal)
    expect(screen.getByTestId("add-book-status-trigger")).toHaveTextContent(
      "Want to read"
    );
  });

  it("shows form error and preserves fields on storage failure (FR-7)", async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        const err = new Error("quota");
        err.name = "QuotaExceededError";
        throw err;
      });
    const { onOpenChange } = renderDialog();
    await screen.findByRole("dialog");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Title"), "Piranesi");
    await user.type(screen.getByLabelText("Author"), "Susanna Clarke");
    await user.click(screen.getByTestId("add-book-submit"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/couldn't save/i);
    });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
      "Piranesi"
    );
    expect((screen.getByLabelText("Author") as HTMLInputElement).value).toBe(
      "Susanna Clarke"
    );
    setItemSpy.mockRestore();
  });
});
