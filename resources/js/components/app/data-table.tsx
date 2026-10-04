import { type ReactNode, useState } from 'react';

import { Pagination } from '@/components/app/pagination';
import { SimplePager } from '@/components/app/simple-pager';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

export interface DataTableColumn<T> {
  /** Kunci unik kolom (untuk React key). */
  key: string;
  /** Judul kolom. Untuk kolom aksi, isi teks lalu set isHeaderHidden agar tetap terbaca pembaca layar. */
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  isHeaderHidden?: boolean;
  /** Kelas untuk <th> (mis. lebar kolom). */
  headClassName?: string;
  /** Kelas untuk <td>; bisa berupa fungsi bila tergantung isi baris. */
  className?: string | ((row: T) => string | undefined);
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  /**
   * - `Paginated<T>` (hasil `->paginate()` Laravel) → paginasi server otomatis (tautan Inertia).
   * - `T[]` → tanpa paginasi, atau paginasi klien bila `pageSize` diisi.
   */
  rows: T[] | Paginated<T>;
  getRowKey: (row: T) => string | number;
  emptyMessage?: string;
  /** Umumkan perubahan isi tabel ke pembaca layar (tabel yang diperbarui otomatis). */
  isLive?: boolean;
  /** Paginasi klien untuk `rows` berupa array. Halaman kembali ke 1 setiap kali `rows` berganti (mis. hasil filter). */
  pageSize?: number;
  /** Kata benda di keterangan paginasi klien, mis. "mahasiswa". */
  itemLabel?: string;
  /** Tampilan kartu di layar < md (halaman mahasiswa/ponsel). Tabel tetap dipakai di desktop. */
  renderCard?: (row: T) => ReactNode;
}

function isPaginated<T>(rows: T[] | Paginated<T>): rows is Paginated<T> {
  return !Array.isArray(rows);
}

/**
 * Tabel generik + paginasi bawaan. Data mengalir:
 * rows (props halaman) → [potong per halaman] → columns[].cell(row) → sel → pager.
 * Halaman cukup memanggil <DataTable>, tanpa memanggil komponen paginasi sendiri.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = 'Tidak ada data yang cocok.',
  isLive = false,
  pageSize,
  itemLabel = 'data',
  renderCard,
}: DataTableProps<T>) {
  const server = isPaginated(rows) ? rows : null;
  const all = server ? server.data : (rows as T[]);

  // Paginasi klien. Reset ke halaman 1 saat referensi rows berubah
  // (pola "menyesuaikan state saat props berubah" dari dokumentasi React, tanpa useEffect).
  const [page, setPage] = useState(1);
  const [prevRows, setPrevRows] = useState(rows);
  if (prevRows !== rows) {
    setPrevRows(rows);
    setPage(1);
  }

  const isClientPaged = !server && pageSize !== undefined && pageSize > 0;
  const pageCount = isClientPaged ? Math.max(1, Math.ceil(all.length / pageSize)) : 1;
  const current = Math.min(page, pageCount);
  const start = isClientPaged ? (current - 1) * pageSize : 0;
  const end = isClientPaged ? start + pageSize : all.length;

  /** Baris di luar halaman aktif disembunyikan di layar tetapi tetap tercetak (laporan/rekap). */
  const isOnPage = (index: number) => index >= start && index < end;

  return (
    <div className="flex flex-col gap-4">
      <Table className={cn(renderCard && 'hidden md:table')}>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={cn(col.align === 'right' && 'text-right', col.headClassName)}>
                {col.isHeaderHidden ? <span className="sr-only">{col.header}</span> : col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody aria-live={isLive ? 'polite' : undefined}>
          {all.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            all.map((row, index) => (
              <TableRow key={getRowKey(row)} className={cn(!isOnPage(index) && 'hidden print:table-row')}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={cn(col.align === 'right' && 'text-right', typeof col.className === 'function' ? col.className(row) : col.className)}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {renderCard && (
        <ul className="flex flex-col gap-2 md:hidden">
          {all.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</li>}
          {all.slice(start, end).map((row) => (
            <li key={getRowKey(row)}>{renderCard(row)}</li>
          ))}
        </ul>
      )}

      {server && (
        <div className="print:hidden">
          <Pagination page={server} />
        </div>
      )}
      {isClientPaged && all.length > 0 && (
        <SimplePager page={current} pageCount={pageCount} total={all.length} pageSize={pageSize} onPageChange={setPage} noun={itemLabel} />
      )}
    </div>
  );
}
