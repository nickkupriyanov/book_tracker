import * as React from "react";
import { Input } from "@/components/ui/input";

interface ShelfSearchProps {
  value: string;
  onChange: (next: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}

export function ShelfSearch({ value, onChange, inputRef }: ShelfSearchProps) {
  return (
    <Input
      ref={inputRef}
      type="search"
      placeholder="Search title, author, or tag…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Search books"
      data-testid="shelf-search"
    />
  );
}
