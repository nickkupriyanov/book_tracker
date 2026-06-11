"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, X } from "lucide-react";
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
  { href: "/achievements", label: "Achievements" },
];

/**
 * The global app header (spec 020 §5.1). Carries the app
 * title, the section navigation, and a right-aligned primary
 * `Add book` action that opens the shared `AddBookDialog`.
 *
 * On `sm:` and up, the navigation is rendered inline alongside
 * the title. Below `sm` the inline nav would overflow
 * horizontally with the four-link catalog (and earlier did);
 * instead, a hamburger button reveals the links as a
 * stacked list directly under the header. Escape closes the
 * mobile menu for keyboard users.
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavId = useId();

  const canAddBook = status === "ready";

  // Close the mobile menu whenever the route changes — the
  // user has navigated, so leaving the panel open would feel
  // stale. Re-mounts with a new route get a fresh close state.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Escape closes the mobile menu for keyboard users.
  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  return (
    <header className="border-border border-b bg-card/50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:gap-x-6 sm:px-6">
        <Link
          href="/"
          className="font-serif text-xl whitespace-nowrap text-foreground transition-colors hover:text-primary"
        >
          Book Tracker
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileNavOpen}
          aria-controls={mobileNavId}
          onClick={() => setMobileNavOpen((open) => !open)}
          data-testid="header-nav-toggle"
          data-state={mobileNavOpen ? "open" : "closed"}
          className="sm:hidden"
        >
          {mobileNavOpen ? (
            <X className="size-5" aria-hidden />
          ) : (
            <Menu className="size-5" aria-hidden />
          )}
        </Button>
        <nav
          id={mobileNavId}
          aria-label="Primary"
          className="hidden min-w-0 flex-1 items-center gap-4 sm:flex"
        >
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
      {mobileNavOpen && (
        <nav
          aria-label="Primary"
          data-testid="header-mobile-nav"
          className="border-border/60 flex flex-col gap-1 border-t px-4 py-2 sm:hidden"
        >
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "rounded-md px-2 py-2 text-sm transition-colors",
                  isActive
                    ? "text-foreground bg-secondary font-medium"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
      <AddBookDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </header>
  );
}
