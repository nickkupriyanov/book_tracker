import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
