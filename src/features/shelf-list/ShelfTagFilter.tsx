import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ShelfTagFilterProps {
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}

export function ShelfTagFilter({ tags, selected, onToggle }: ShelfTagFilterProps) {
  if (tags.length === 0) return null;

  const wrapperClass = cn(
    tags.length > 20
      ? "overflow-x-auto whitespace-nowrap"
      : "flex flex-wrap gap-1"
  );

  return (
    <div className={wrapperClass} data-testid="shelf-tag-filter">
      {tags.map((tag) => {
        const isSelected = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            onClick={() => onToggle(tag)}
            data-testid={`shelf-tag-${tag}`}
            className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
          >
            <Badge variant={isSelected ? "secondary" : "outline"}>#{tag}</Badge>
          </button>
        );
      })}
    </div>
  );
}
