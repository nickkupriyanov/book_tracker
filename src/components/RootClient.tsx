"use client";

import { useEffect, type ReactNode } from "react";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { useBookLibrary } from "@/state/book-library";

/**
 * Root-level client wrapper that initialises the book library
 * store on mount. Wraps the root layout's `children` so every
 * page (shelf, detail, future routes) sees a `ready` store
 * after the first effect tick.
 *
 * Why this exists: previously the `init()` call lived in
 * `ShelfClient`, which only mounts on `/`. Direct loads on
 * `/book/<id>` (reload, paste URL, deep link) would never
 * call init, leaving the store stuck in `loading` and
 * BookDetail showing `<DetailLoading />` forever. Moving init
 * to the root layout fixes that — every page benefits, no
 * duplicate-effect dance required.
 *
 * The init is idempotent (the store's `init` is a no-op once
 * the first call succeeds), so multiple mounts across
 * navigations are safe and cheap.
 */
export function RootClient({ children }: { children: ReactNode }) {
  useEffect(() => {
    useBookLibrary
      .getState()
      .init(new LocalStorageAdapter())
      .catch((err: unknown) => {
        console.error("[RootClient] Failed to init library", err);
      });
  }, []);

  return <>{children}</>;
}
