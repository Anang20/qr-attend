import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

import type { Filters } from '@/types';

/** Nilai "semua" pada Select filter (Radix Select tidak menerima value kosong). */
export const ALL = 'all';

/**
 * Filter tabel yang tersimpan di query string.
 * Pencarian teks di-debounce 350 ms agar tidak membanjiri server.
 * `fixed` = parameter tetap halaman (mis. periode/kelas) yang ikut dikirim; halaman kembali ke 1 saat filter berubah.
 */
export function useFilters(url: string, initial: Filters, fixed: Filters = {}) {
  const [filters, setFilters] = useState<Filters>(initial);
  const first = useRef(true);
  const fixedKey = JSON.stringify(fixed);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      // Batas baris per halaman yang dipilih pengguna tidak hilang saat mencari/menyaring.
      const perPage = new URLSearchParams(window.location.search).get('per_page');
      const query = Object.fromEntries(Object.entries({ ...(JSON.parse(fixedKey) as Filters), ...filters, ...(perPage ? { per_page: perPage } : {}) }).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== ALL));
      router.get(url, query, { preserveState: true, preserveScroll: true, replace: true });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [filters, url, fixedKey]);

  const setFilter = (key: string, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));
  const reset = () => setFilters({});
  const isDirty = Object.values(filters).some((v) => v !== undefined && v !== '' && v !== ALL);

  return { filters, setFilter, reset, isDirty };
}
