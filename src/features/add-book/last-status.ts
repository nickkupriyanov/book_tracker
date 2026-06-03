import type { ReadingStatus } from "@/types/book";

/**
 * In-memory "last used reading status" for the Add Book dialog.
 * Satisfies spec §12 D2: the dialog remembers the last status the user
 * picked, in-memory only, resets on full page reload (by design).
 */

let lastStatus: ReadingStatus = "want";

export function getLastStatus(): ReadingStatus {
  return lastStatus;
}

export function setLastStatus(status: ReadingStatus): void {
  lastStatus = status;
}

/**
 * @internal
 * Resets the module state for tests. Not for production use.
 */
export function __resetLastStatus(): void {
  lastStatus = "want";
}
