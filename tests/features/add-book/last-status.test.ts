import { describe, it, expect, beforeEach } from "vitest";
import {
  getLastStatus,
  setLastStatus,
  __resetLastStatus,
} from "@/features/add-book/last-status";
import type { ReadingStatus } from "@/types/book";

describe("last-status", () => {
  beforeEach(() => {
    __resetLastStatus();
  });

  describe("getLastStatus", () => {
    it("returns 'want' by default", () => {
      expect(getLastStatus()).toBe<ReadingStatus>("want");
    });

    it("returns the value last passed to setLastStatus", () => {
      setLastStatus("reading");
      expect(getLastStatus()).toBe<ReadingStatus>("reading");
    });
  });

  describe("setLastStatus", () => {
    it.each<ReadingStatus>(["want", "reading", "read"])(
      "accepts %s",
      (status) => {
        setLastStatus(status);
        expect(getLastStatus()).toBe(status);
      }
    );

    it("overwrites previous value", () => {
      setLastStatus("read");
      setLastStatus("want");
      expect(getLastStatus()).toBe<ReadingStatus>("want");
    });
  });

  describe("__resetLastStatus", () => {
    it("returns to the default 'want'", () => {
      setLastStatus("reading");
      __resetLastStatus();
      expect(getLastStatus()).toBe<ReadingStatus>("want");
    });
  });
});
