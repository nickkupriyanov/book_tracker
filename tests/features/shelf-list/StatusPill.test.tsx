import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "@/features/shelf-list/StatusPill";
import type { ReadingStatus } from "@/types/book";

describe("StatusPill", () => {
  describe("label", () => {
    it.each<[ReadingStatus, string]>([
      ["want", "Want to read"],
      ["reading", "Reading"],
      ["read", "Read"],
    ])("renders %s status as '%s'", (status, label) => {
      render(<StatusPill status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe("icon (D1)", () => {
    it("renders a checkmark inside the 'read' pill", () => {
      render(<StatusPill status="read" />);
      const pill = screen.getByText("Read");
      expect(pill.querySelector("svg")).toBeInTheDocument();
    });

    it.each<ReadingStatus>(["want", "reading"])(
      "does not render a checkmark for '%s'",
      (status) => {
        render(<StatusPill status={status} />);
        const label = status === "want" ? "Want to read" : "Reading";
        const pill = screen.getByText(label);
        expect(pill.querySelector("svg")).toBeNull();
      }
    );
  });

  describe("color classes", () => {
    it("applies muted classes for 'want'", () => {
      render(<StatusPill status="want" />);
      const pill = screen.getByText("Want to read");
      expect(pill.className).toContain("bg-muted");
      expect(pill.className).toContain("text-muted-foreground");
    });

    it("applies primary-tinted classes for 'reading'", () => {
      render(<StatusPill status="reading" />);
      const pill = screen.getByText("Reading");
      expect(pill.className).toContain("bg-primary/10");
      expect(pill.className).toContain("text-primary");
    });

    it("applies muted classes for 'read'", () => {
      render(<StatusPill status="read" />);
      const pill = screen.getByText("Read");
      expect(pill.className).toContain("bg-muted");
      expect(pill.className).toContain("text-muted-foreground");
    });
  });
});
