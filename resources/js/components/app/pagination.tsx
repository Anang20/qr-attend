import { Link } from '@inertiajs/react';

import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

/** Label tautan paginasi Laravel berisi entitas HTML (&laquo;) — diganti teks biasa. */
function cleanLabel(label: string): string {
  return label.replace('&laquo;', '‹').replace('&raquo;', '›').replace(/&[a-z]+;/g, '').trim();
}

export function Pagination<T>({ page }: { page: Paginated<T> }) {
  if (page.last_page <= 1) {
    return (
      <p className="text-sm text-muted-foreground">
        {page.total > 0 ? `Menampilkan ${page.from}–${page.to} dari ${page.total}` : ''}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Menampilkan {page.from}–{page.to} dari {page.total}
      </p>
      <nav aria-label="Halaman" className="flex items-center gap-1">
        {page.links.map((link, i) =>
          link.url ? (
            <Link
              key={`${link.label}-${i}`}
              href={link.url}
              preserveScroll
              preserveState
              aria-current={link.active ? 'page' : undefined}
              className={cn(
                'flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-semibold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                link.active && 'bg-primary text-primary-foreground hover:bg-primary',
              )}
            >
              {cleanLabel(link.label)}
            </Link>
          ) : (
            <span key={`${link.label}-${i}`} className="flex h-9 min-w-9 items-center justify-center px-3 text-sm text-muted-foreground/60">
              {cleanLabel(link.label)}
            </span>
          ),
        )}
      </nav>
    </div>
  );
}
