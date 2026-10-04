import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

import { type CourseRecap, CourseRecapList } from '@/components/app/course-recap-list';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { SelectField } from '@/components/app/select-field';
import { AttendanceBadge } from '@/components/app/session-status-badge';
import { StatCard } from '@/components/app/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useFilters } from '@/hooks/use-filters';
import AppLayout from '@/layouts/app-layout';
import type { Filters, Option, Paginated } from '@/types';

interface HistoryRecord {
  id: number;
  date: string;
  course: string;
  classGroup: string;
  schedule: string;
  meetingNo: number;
  time: string | null;
  method: string;
  status: string;
}

interface Props {
  period: string | null;
  records: Paginated<HistoryRecord>;
  filters: Filters;
  tiles: { present: number; late: number; excused: number; absent: number; rate: number | null };
  courses: Option[];
  statuses: Option[];
  recap: CourseRecap[];
}

const URL = '/mahasiswa/riwayat';
const dayFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

/** "2026-09-28" → "Sen, 28 Sep" */
function shortDay(value: string): string {
  return dayFormatter.format(new Date(`${value}T00:00:00`)).replace('.', '');
}

const detailHref = (r: HistoryRecord) => `${URL}/${r.id}`;

const columns: DataTableColumn<HistoryRecord>[] = [
  { key: 'date', header: 'Tanggal', className: 'whitespace-nowrap text-muted-foreground', cell: (r) => shortDay(r.date) },
  { key: 'course', header: 'Mata kuliah', className: 'font-bold', cell: (r) => r.course },
  { key: 'class', header: 'Kelas', cell: (r) => r.classGroup },
  { key: 'schedule', header: 'Jadwal', className: 'tabular-nums whitespace-nowrap', cell: (r) => r.schedule },
  { key: 'time', header: 'Waktu presensi', className: 'tabular-nums', cell: (r) => r.time ?? '—' },
  { key: 'method', header: 'Metode', cell: (r) => (r.time ? r.method : '—') },
  { key: 'status', header: 'Status', cell: (r) => <AttendanceBadge status={r.status} /> },
  {
    key: 'action',
    header: 'Aksi',
    align: 'right',
    cell: (r) => (
      <Link href={detailHref(r)} className="font-bold text-primary hover:underline" aria-label={`Detail ${r.course} ${shortDay(r.date)}`}>
        Detail
      </Link>
    ),
  },
];

function HistoryCard(r: HistoryRecord) {
  return (
    <Link href={detailHref(r)} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-bold">{r.course}</span>
        <span className="text-xs text-muted-foreground">
          {shortDay(r.date)} · {r.schedule}
          {r.time ? ` · ${r.time}` : ''}
        </span>
      </div>
      <AttendanceBadge status={r.status} />
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

export default function StudentHistory({ period, records, filters: initial, tiles, courses, statuses, recap }: Props) {
  const { filters, setFilter, reset, isDirty } = useFilters(URL, initial);
  const total = tiles.present + tiles.late + tiles.excused + tiles.absent;
  const attended = tiles.present + tiles.late + tiles.excused;

  return (
    <AppLayout title="Riwayat Presensi">
      <PageHeader title="Riwayat Presensi" description={period ?? 'Belum ada periode aktif'} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <div className="col-span-2 flex flex-col gap-2 rounded-2xl bg-brand-deep p-5 text-white md:col-span-1">
          <div className="flex items-center justify-between text-sm text-emerald-100">
            <span>Persentase kehadiran</span>
            <span className="tabular-nums">
              {attended}/{total}
            </span>
          </div>
          <span className="text-3xl leading-none font-extrabold">{tiles.rate !== null ? `${tiles.rate}%` : '—'}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/20" aria-hidden>
            <div className="h-full rounded-full bg-emerald-300" style={{ width: `${tiles.rate ?? 0}%` }} />
          </div>
        </div>
        <StatCard label="Hadir" value={tiles.present} />
        <StatCard label="Terlambat" value={tiles.late} />
        <StatCard label="Tidak hadir" value={tiles.absent} />
        <StatCard label="Izin" value={tiles.excused} />
      </div>

      <Card className="gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-48 flex-1 flex-col gap-2 sm:max-w-80">
            <Label htmlFor="f-course">Mata kuliah</Label>
            <SelectField id="f-course" value={filters.course_id} options={courses} allLabel="Semua mata kuliah" onValueChange={(v) => setFilter('course_id', v)} />
          </div>
          <div className="flex min-w-40 flex-col gap-2">
            <Label htmlFor="f-status">Status</Label>
            <SelectField id="f-status" value={filters.status} options={statuses} allLabel="Semua status" onValueChange={(v) => setFilter('status', v)} />
          </div>
          {isDirty && (
            <Button type="button" variant="ghost" onClick={reset} className="ml-auto text-primary">
              Atur ulang
            </Button>
          )}
        </div>

        {/* Desktop: tabel; ponsel: kartu (renderCard) agar nyaman dibaca di 390 px. Paginasi sudah di dalam DataTable. */}
        <DataTable columns={columns} rows={records} getRowKey={(r) => r.id} emptyMessage="Belum ada riwayat presensi." renderCard={HistoryCard} />
      </Card>

      {recap.length > 0 && (
        <Card className="gap-4">
          <div>
            <h2 className="text-lg font-bold">Kelayakan UAS per mata kuliah</h2>
            <p className="text-sm text-muted-foreground">Batas minimal kehadiran 75% dari 16 pertemuan.</p>
          </div>
          <CourseRecapList items={recap} />
        </Card>
      )}
    </AppLayout>
  );
}
