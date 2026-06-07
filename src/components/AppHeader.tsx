"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Главная" },
  { href: "/library", label: "Библиотека" },
  { href: "/stats", label: "Статистика" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-border border-b bg-card/50">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-serif text-xl text-foreground transition-colors hover:text-primary"
        >
          Book Tracker
        </Link>
        <nav className="flex items-center gap-4">
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
      </div>
    </header>
  );
}
