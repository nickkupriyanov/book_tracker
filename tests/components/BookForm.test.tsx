import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookForm } from "@/components/BookForm";
import type { BookInput } from "@/types/book";

const baseInput: BookInput = {
  title: "Piranesi",
  author: "Susanna Clarke",
  status: "reading",
  tags: ["fiction"],
};

describe("BookForm", () => {
  it("renders initial values in fields", () => {
    render(
      <BookForm
        initialValues={baseInput}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Title")).toHaveValue("Piranesi");
    expect(screen.getByLabelText("Author")).toHaveValue("Susanna Clarke");
    expect(screen.getByLabelText("Status")).toHaveTextContent("Reading");
  });

  it("renders the submit button with the given label", () => {
    render(
      <BookForm
        initialValues={baseInput}
        submitLabel="Save changes"
        onSubmit={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: "Save changes" })
    ).toBeInTheDocument();
  });

  it("disables submit when title is empty", () => {
    render(
      <BookForm
        initialValues={{ ...baseInput, title: "" }}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("disables submit when author is empty", () => {
    render(
      <BookForm
        initialValues={{ ...baseInput, author: "" }}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("shows validation errors and keeps open on bad input", async () => {
    const user = userEvent.setup();
    render(
      <BookForm
        initialValues={{ ...baseInput, coverUrl: "not-a-url" }}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.getByText(/http/i)).toBeInTheDocument();
    });
  });

  it("calls onSubmit with validated input, then onSuccess on success", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(
      <BookForm
        initialValues={baseInput}
        submitLabel="Save"
        onSubmit={onSubmit}
        onSuccess={onSuccess}
      />
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Piranesi",
        author: "Susanna Clarke",
        status: "reading",
        tags: ["fiction"],
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("shows form error and preserves fields when onSubmit throws", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("storage full"));
    const user = userEvent.setup();
    render(
      <BookForm
        initialValues={baseInput}
        submitLabel="Save"
        onSubmit={onSubmit}
      />
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/couldn't save/i);
    });
    expect(screen.getByLabelText("Title")).toHaveValue("Piranesi");
    expect(screen.getByLabelText("Author")).toHaveValue("Susanna Clarke");
  });

  describe("rating field (spec 006)", () => {
    it("renders the Rating Select with the right initial value", () => {
      render(
        <BookForm
          initialValues={{ ...baseInput, rating: 4 }}
          submitLabel="Save"
          onSubmit={vi.fn()}
        />
      );
      const trigger = screen.getByTestId("book-form-rating-trigger");
      expect(trigger).toHaveTextContent("4 stars");
    });

    it("renders 'Not rated' as the default when no rating is provided", () => {
      render(
        <BookForm
          initialValues={baseInput}
          submitLabel="Save"
          onSubmit={vi.fn()}
        />
      );
      const trigger = screen.getByTestId("book-form-rating-trigger");
      expect(trigger).toHaveTextContent("Not rated");
    });

    it("includes the selected rating in the onSubmit input", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(
        <BookForm
          initialValues={baseInput}
          submitLabel="Save"
          onSubmit={onSubmit}
        />
      );
      // Open the Rating Select and pick "3 stars".
      await user.click(screen.getByTestId("book-form-rating-trigger"));
      await user.click(screen.getByRole("option", { name: "3 stars" }));
      // Submit.
      await user.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ rating: 3 })
        );
      });
    });

    it("omits the rating from onSubmit input when 'Not rated' is selected", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(
        <BookForm
          initialValues={{ ...baseInput, rating: 5 }}
          submitLabel="Save"
          onSubmit={onSubmit}
        />
      );
      // Open the Rating Select and pick "Not rated".
      await user.click(screen.getByTestId("book-form-rating-trigger"));
      await user.click(screen.getByRole("option", { name: "Not rated" }));
      // Submit.
      await user.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
      const callArg = onSubmit.mock.calls[0]?.[0] as BookInput;
      expect("rating" in callArg).toBe(false);
    });
  });
});
