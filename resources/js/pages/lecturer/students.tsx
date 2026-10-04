import { Link, router } from '@inertiajs/react';
import { ArrowLeft, Search, UsersRound } from 'lucide-react';

import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { type RecapStatus, RecapStatusBadge } from '@/components/app/recap-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFilters } from '@/hooks/use-filters';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

interface ClassCard {
  id: number;
  code: string;
  cohortYear: number;
  courses: string[];
  studentsCount: number;
}

interface StudentRow {
  studentId: number;
  name: string;
  nim: string;
  courses: Record<string, { percent: number | null; absent: number; status: RecapStatus }>;
}

interface Props {
  period: string | null;
  classes: ClassCard[];
  selectedClass: ClassCard | null;
  courses: { id: number; name: string }[];
  rows: Paginated<StudentRow> | null;
  search: string;
}

export default function LecturerStudents({ period, classes, selectedClass, courses, rows, search }: Props) {
  const { filters, setFilter } = useFilters('/dosen/mahasiswa', { q: search }, { class_group_id: selectedClass ? String(selectedClass.id) : undefined });

  const columns: DataTableColumn<StudentRow>[] = [
    { key: 'nim', header: 'NIM', className: 'tabular-nums', cell: (r) => r.nim },
    { key: 'name', header: 'Nama', className: 'font-semibold', cell: (r) => r.name },
    ...courses.map(
      (c): DataTableColumn<StudentRow> => ({
        key: `course-${c.id}`,
        header: c.name,
        cell: (r) => {
          const info = r.courses[c.id];
          if (!info) return '—';
          return (
            <div className="flex items-center gap-2">
              <span className="w-12 font-bold tabular-nums">{info.percent !== null ? `${info.percent}%` : '—'}</span>
              <RecapStatusBadge status={info.status} />
              {info.absent > 0 && <span className="text-xs text-muted-foreground">A {info.absent}</span>}
            </div>
          );
        },
      }),
    ),
  ];

  if (!selectedClass) {
    return (
      <AppLayout title="Mahasiswa">
        <PageHeader title="Mahasiswa" description={`${period ? `Periode ${period} · ` : ''}pilih kelas untuk melihat daftar mahasiswa.`} />
        {classes.length === 0 && <Card className="text-sm text-muted-foreground">Anda belum mengajar kelas di periode ini.</Card>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => router.get('/dosen/mahasiswa', { class_group_id: c.id })}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-5 text-left transition-colors hover:border-emerald-300 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-extrabold">{c.code}</span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <UsersRound className="size-4" aria-hidden />
                  {c.studentsCount}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Angkatan {c.cohortYear}</p>
              <div className="flex flex-wrap gap-1.5">
                {c.courses.map((name) => (
                  <Badge key={name}>{name}</Badge>
                ))}
              </div>
            </button>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Mahasiswa ${selectedClass.code}`}>
      <div className="flex flex-col gap-2">
        <Link href="/dosen/mahasiswa" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden />
          Pilih kelas lain
        </Link>
        <PageHeader
          title={`Mahasiswa ${selectedClass.code}`}
          description={`${selectedClass.studentsCount} mahasiswa · kehadiran di mata kuliah yang Anda ampu`}
          actions={
            <Button asChild variant="outline">
              <Link href="/dosen/rekap-kehadiran">Lihat rekap lengkap</Link>
            </Button>
          }
        />
      </div>

      <Card className={cn('gap-4')}>
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={filters.q ?? ''} onChange={(e) => setFilter('q', e.target.value)} placeholder="Cari nama atau NIM" aria-label="Cari nama atau NIM" className="pl-9" />
        </div>
        {rows && <DataTable columns={columns} rows={rows} getRowKey={(r) => r.studentId} emptyMessage="Mahasiswa tidak ditemukan." />}
      </Card>
    </AppLayout>
  );
}
