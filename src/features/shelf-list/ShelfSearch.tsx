import { Input } from "@/components/ui/input";

interface ShelfSearchProps {
  value: string;
  onChange: (next: string) => void;
}

export function ShelfSearch({ value, onChange }: ShelfSearchProps) {
  return (
    <Input
      type="search"
      placeholder="Search title, author, or tag…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Search books"
      data-testid="shelf-search"
    />
  );
}
