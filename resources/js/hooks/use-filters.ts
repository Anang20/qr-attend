import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

import type { Filters } from '@/types';

/** Nilai "semua" pada Select filter (Radix Select tidak menerima value kosong). */
export const ALL = 'all';

/**
 * Filter tabel yang tersimpan di query string.
 * Pencarian teks di-debounce 350 ms agar tidak membanjiri server.
 */
export function useFilters(url: string, initial: Filters) {
  const [filters, setFilters] = useState<Filters>(initial);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== '' && v !== ALL));
      router.get(url, query, { preserveState: true, preserveScroll: true, replace: true });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [filters, url]);

  const setFilter = (key: string, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));
  const reset = () => setFilters({});
  const isDirty = Object.values(filters).some((v) => v !== undefined && v !== '' && v !== ALL);

  return { filters, setFilter, reset, isDirty };
}
