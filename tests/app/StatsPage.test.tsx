import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/stats/page";
import { StatsClient } from "@/app/stats/StatsClient";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary, __resetBookLibrary } from "@/state/book-library";

describe("StatsPage wrapper", () => {
  it("renders inside the shared page container", () => {
    render(<Page />);
    expect(screen.getByTestId("page-container")).toBeInTheDocument();
  });

  it("renders the Statistics heading", () => {
    render(<Page />);
    expect(
      screen.getByRole("heading", { name: /statistics/i })
    ).toBeInTheDocument();
  });

  it("no longer renders the placeholder copy", () => {
    render(<Page />);
    expect(
      screen.queryByText(/reading statistics will live here/i)
    ).not.toBeInTheDocument();
  });
});

describe("StatsClient — store states (spec 021 T2)", () => {
  beforeEach(() => {
    __resetBookLibrary();
    localStorage.clear();
  });

  it("renders the loading state when the store has not been initialised", () => {
    __resetBookLibrary();
    render(<StatsClient />);
    expect(screen.getByTestId("stats-loading")).toBeInTheDocument();
    expect(
      screen.queryByTestId("stats-portrait")
    ).not.toBeInTheDocument();
  });

  it("renders the error state when the store is in 'error' status", () => {
    __resetBookLibrary();
    useBookLibrary.setState({ status: "error" });
    render(<StatsClient />);
    expect(screen.getByTestId("stats-error")).toBeInTheDocument();
    expect(
      screen.queryByTestId("stats-portrait")
    ).not.toBeInTheDocument();
  });

  it("renders the empty-shelf affordance in the ready empty state", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    render(<StatsClient />);
    expect(screen.getByTestId("stats-empty")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add your first book/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("stats-portrait")
    ).not.toBeInTheDocument();
  });

  it("renders the portrait wrapper when the library is populated", async () => {
    await useBookLibrary.getState().init(new LocalStorageAdapter());
    await useBookLibrary.getState().addBook({
      title: "Piranesi",
      author: "Susanna Clarke",
      status: "reading",
      tags: [],
    });
    render(<StatsClient />);
    expect(screen.getByTestId("stats-portrait")).toBeInTheDocument();
  });
});
