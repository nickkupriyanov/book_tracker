/**
 * Shown inside the shelf grid area when the user has books but the
 * active filter matches none of them. No CTA — the user can switch tabs.
 */
export function EmptyFilterResult() {
  return (
    <div className="text-muted-foreground py-12 text-center text-sm">
      No books with this status.
    </div>
  );
}
