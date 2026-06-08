import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClearFiltersProps {
  onClick: () => void;
}

/**
 * The "Clear filters" button. Inline-friendly: the parent
 * (`ShelfList`) places it inside its filter block alongside
 * the sort control (spec 020 §5.4). No wrapping flex row
 * here — the parent owns the layout.
 */
export function ClearFilters({ onClick }: ClearFiltersProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      data-testid="shelf-clear-filters"
      className="gap-1.5"
    >
      <X aria-hidden="true" className="size-4" />
      Clear filters
    </Button>
  );
}
