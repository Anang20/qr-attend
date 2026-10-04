import { RotateCcw, Search } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DataToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  isDirty: boolean;
  onReset: () => void;
  total: number;
  /** Select filter tambahan. */
  children?: ReactNode;
}

export function DataToolbar({ search, onSearchChange, searchPlaceholder, isDirty, onReset, total, children }: DataToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-60 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="pl-9"
        />
      </div>
      {children}
      {isDirty && (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw aria-hidden />
          Atur ulang
        </Button>
      )}
      <span className="ml-auto text-sm text-muted-foreground" aria-live="polite">
        {total.toLocaleString('id-ID')} data
      </span>
    </div>
  );
}
