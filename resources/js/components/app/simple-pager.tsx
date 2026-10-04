import { cn } from '@/lib/utils';

interface SimplePagerProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  noun?: string;
}

/** Paginasi untuk data yang sudah ada di klien (tanpa request ke server). */
export function SimplePager({ page, pageCount, total, pageSize, onPageChange, noun = 'data' }: SimplePagerProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <p className="text-sm text-muted-foreground">
        Menampilkan {from}–{to} dari {total} {noun}
      </p>
      {pageCount > 1 && (
        <nav aria-label="Halaman" className="flex items-center gap-1">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-semibold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                p === page && 'bg-primary text-primary-foreground hover:bg-primary',
              )}
            >
              {p}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
