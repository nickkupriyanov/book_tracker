"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { AddBookDialog } from "@/features/add-book";
import { Button } from "@/components/ui/button";
import { useBookLibrary } from "@/state/book-library";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/stats", label: "Statistics" },
];

/**
 * The global app header (spec 020 §5.1). Carries the app
 * title, the section navigation, and a right-aligned primary
 * `Add book` action that opens the shared `AddBookDialog`.
 *
 * The button is disabled while the library store is not
 * `ready` so a click can never reach `useBookLibrary.addBook`
 * before `RootClient` has finished initialising the adapter.
 * Page-level loading and error messages are still responsible
 * for explaining those states; the button just refuses to
 * submit early.
 */
export function AppHeader() {
  const pathname = usePathname();
  const status = useBookLibrary((s) => s.status);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canAddBook = status === "ready";

  return (
    <header className="border-border border-b bg-card/50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:flex-nowrap sm:px-6">
        <Link
          href="/"
          className="font-serif text-xl whitespace-nowrap text-foreground transition-colors hover:text-primary"
        >
          Book Tracker
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "text-sm transition-colors",
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex w-full items-center sm:ml-auto sm:w-auto">
          <Button
            type="button"
            onClick={() => setDialogOpen(true)}
            disabled={!canAddBook}
            data-testid="header-add-book"
            data-state={canAddBook ? "ready" : "loading"}
            size="sm"
            className="w-full gap-1.5 sm:w-auto"
          >
            <Plus className="size-4" aria-hidden />
            Add book
          </Button>
        </div>
      </div>
      <AddBookDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </header>
  );
}
