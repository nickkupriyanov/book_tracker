/**
 * The loading state for the detail page. Shown while the
 * `useBookLibrary` store's status is `'loading'` (initial
 * mount, before `init()` resolves from localStorage). Same
 * centred layout as `DetailNotFound` and `EmptyShelf`.
 */
export function DetailLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-muted-foreground font-serif text-lg">
        Loading…
      </p>
    </div>
  );
}
