import { Link, router } from '@inertiajs/react';

import { SelectField } from '@/components/app/select-field';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

/**
 * Daftar tombol halaman ringkas: halaman pertama, terakhir, aktif ±1, dan "…" di sela-selanya.
 * Contoh (aktif 6 dari 20): 1 … 5 6 7 … 20
 */
export function pageItems(current: number, last: number): (number | 'gap')[] {
  const wanted = new Set([1, last, current - 1, current, current + 1].filter((p) => p >= 1 && p <= last));
  const pages = [...wanted].sort((a, b) => a - b);

  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1]! > 1 ? (p - pages[i - 1]! === 2 ? [p - 1, p] : ['gap' as const, p]) : [p]));
}

/** Pilihan batas baris per halaman; harus sama dengan App\Support\PerPage::OPTIONS. */
const PER_PAGE_OPTIONS = [10, 25, 50, 100].map((n) => ({ value: String(n), label: `${n} / halaman` }));

const itemClass =
  'flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-semibold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none';

/** URL halaman ke-n: ambil tautan mana pun dari paginator Laravel (sudah membawa filter) lalu ganti `page`. */
function urlForPage(page: Paginated<unknown>, n: number): string | null {
  const base = page.links.find((l) => l.url)?.url;
  if (!base) return null;
  const url = new URL(base, window.location.origin);
  url.searchParams.set('page', String(n));
  return url.pathname + url.search;
}

/** Ganti batas baris per halaman (diproses server), kembali ke halaman 1, filter lain tetap. */
function changePerPage(value: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('per_page', value);
  url.searchParams.delete('page');
  router.get(url.pathname + url.search, {}, { preserveScroll: true, preserveState: true });
}

export function Pagination<T>({ page }: { page: Paginated<T> }) {
  if (page.total === 0) return null;

  const perPageSelect = (
    <SelectField aria-label="Baris per halaman" value={String(page.per_page)} options={PER_PAGE_OPTIONS} onValueChange={changePerPage} className="h-9 w-36" />
  );

  const current = page.current_page;
  const step = (n: number, label: string, text: string, isDisabled: boolean) => {
    const href = isDisabled ? null : urlForPage(page, n);
    return href ? (
      <Link href={href} preserveScroll preserveState aria-label={label} className={itemClass}>
        {text}
      </Link>
    ) : (
      <span aria-hidden className={cn(itemClass, 'text-muted-foreground/60 hover:bg-transparent')}>
        {text}
      </span>
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Menampilkan {page.from}–{page.to} dari {page.total}
      </p>
      <div className="flex flex-wrap items-center gap-3">
      {perPageSelect}
      <nav aria-label="Halaman" className="flex items-center gap-1">
        {step(current - 1, 'Halaman sebelumnya', '‹', current <= 1)}
        {pageItems(current, page.last_page).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} aria-hidden className="flex h-9 min-w-6 items-center justify-center text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Link
              key={item}
              href={urlForPage(page, item) ?? '#'}
              preserveScroll
              preserveState
              aria-label={`Halaman ${item}`}
              aria-current={item === current ? 'page' : undefined}
              className={cn(itemClass, item === current && 'bg-primary text-primary-foreground hover:bg-primary')}
            >
              {item}
            </Link>
          ),
        )}
        {step(current + 1, 'Halaman berikutnya', '›', current >= page.last_page)}
      </nav>
      </div>
    </div>
  );
}
