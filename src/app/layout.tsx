import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { RootClient } from "@/components/RootClient";
import { AppHeader } from "@/components/AppHeader";

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
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AppHeader />
        <RootClient>{children}</RootClient>
        <Toaster />
      </body>
    </html>
  );
}
