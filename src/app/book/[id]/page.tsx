"use client";

import { useParams } from "next/navigation";
import { BookDetail } from "@/features/detail-view";

/**
 * Thin client-component wrapper for the /book/[id] route.
 * Extracts the `id` param and passes it to <BookDetail>.
 * The actual page logic lives in `BookDetail` so the route
 * file stays a Next.js entry point (mirrors the
 * `ShelfClient` + `page.tsx` pattern in `src/app/`).
 */
export default function Page() {
  const params = useParams<{ id: string }>();
  return <BookDetail bookId={params.id} />;
}
