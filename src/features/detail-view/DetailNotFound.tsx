import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * The "Book not found" state for the detail page. Renders a
 * centred message and a Back to shelf link to `/`. Same visual
 * language as `EmptyShelf` (cozy, not dashboard).
 */
export function DetailNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h2 className="font-serif text-2xl text-foreground">
        Book not found.
      </h2>
      <p className="text-muted-foreground max-w-sm text-sm">
        The book you&apos;re looking for doesn&apos;t exist in your
        library.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Back to shelf</Link>
      </Button>
    </div>
  );
}
