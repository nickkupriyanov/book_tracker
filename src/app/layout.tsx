import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { RootClient } from "@/components/RootClient";
import { AppHeader } from "@/components/AppHeader";
import { ThemeProvider } from "@/components/ThemeProvider";

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
