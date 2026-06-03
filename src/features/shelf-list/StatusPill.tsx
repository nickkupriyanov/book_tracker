import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReadingStatus } from "@/types/book";

const STATUS_LABEL: Record<ReadingStatus, string> = {
  want: "Want to read",
  reading: "Reading",
  read: "Read",
};

const STATUS_PILL_CLASS: Record<ReadingStatus, string> = {
  want: "bg-muted text-muted-foreground",
  reading: "bg-primary/10 text-primary",
  read: "bg-muted text-muted-foreground",
};

export interface StatusPillProps {
  status: ReadingStatus;
}

/**
 * Small pill that visualizes a book's reading status. "Read" is rendered
 * with a checkmark (per spec 002 D1) and uses a muted palette to keep
 * the cozy theme — no celebratory green.
 */
export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        STATUS_PILL_CLASS[status]
      )}
    >
      {status === "read" && <Check className="size-3" />}
      {STATUS_LABEL[status]}
    </span>
  );
}
