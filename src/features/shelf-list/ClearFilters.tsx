import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClearFiltersProps {
  onClick: () => void;
}

export function ClearFilters({ onClick }: ClearFiltersProps) {
  return (
    <div
      className="flex justify-end"
      data-testid="shelf-clear-filters-row"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        data-testid="shelf-clear-filters"
      >
        <X aria-hidden="true" />
        Clear filters
      </Button>
    </div>
  );
}
