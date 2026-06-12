import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { RootClient } from "@/components/RootClient";
import { AppHeader } from "@/components/AppHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { buildThemeStorageScrubberScript } from "@/lib/themes";

export const metadata: Metadata = {
  title: "Book Tracker",
  description: "A cozy place to track the books you read.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // `suppressHydrationWarning` is required on the root element that
    // `next-themes` mutates (it injects a `data-theme` attribute from
    // an inline script before React hydrates). Without this flag React
    // would warn about a server/client mismatch for the attribute it
    // intentionally writes itself.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Theme storage scrubber. Runs as the first script in <head>,
          before next-themes' inline script reads the persisted theme
          from localStorage. next-themes trusts the stored value as-is
          and applies it straight to <html data-theme>, so any value
          that isn't one of the four approved app themes would be
          applied and persisted verbatim — violating FR-7 and
          producing `data-theme="solarized"` (or similar) on <html>.

          The scrubber normalises any unknown value (including one
          introduced by an older app version or external mutation)
          to the default `paper` before next-themes ever reads it,
          so the user never sees the wrong theme and the bad value
          never gets re-persisted. The set of approved ids is
          duplicated here intentionally — the script must be a
          self-contained string with no imports.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: buildThemeStorageScrubberScript(),
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <AppHeader />
          <RootClient>{children}</RootClient>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
