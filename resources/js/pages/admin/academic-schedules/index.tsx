import { Link } from '@inertiajs/react';
import { ArrowRight, Info } from 'lucide-react';

import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { SelectField } from '@/components/app/select-field';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFilters } from '@/hooks/use-filters';
import AppLayout from '@/layouts/app-layout';
import type { Filters, Option, Paginated } from '@/types';

interface ScheduleRow {
  id: number;
  day: string;
  time: string;
  course: string;
  courseCode: string;
  classGroup: string;
  lecturer: string;
  room: string;
  period: string;
  periodStatus: string;
  periodStatusLabel: string;
}

interface Props {
  schedules: Paginated<ScheduleRow>;
  filters: Filters;
  options: { periods: Option[]; days: Option[]; classGroups: Option[]; lecturers: Option[] };
}

const URL = '/admin/jadwal-akademik';

export default function AcademicSchedulesIndex({ schedules, filters: initialFilters, options }: Props) {
  const { filters, setFilter, reset, isDirty } = useFilters(URL, initialFilters);


  const columns: DataTableColumn<ScheduleRow>[] = [
    { key: 'day', header: 'Hari', className: 'font-semibold', cell: (s) => s.day },
    { key: 'time', header: 'Jam', className: 'whitespace-nowrap tabular-nums', cell: (s) => s.time },
    {
      key: 'course',
      header: 'Mata kuliah',
      cell: (s) => (
        <>
          <p className="font-bold">{s.course}</p>
          <p className="text-xs text-muted-foreground">{s.courseCode}</p>
        </>
      ),
    },
    { key: 'class', header: 'Kelas', cell: (s) => s.classGroup },
    { key: 'lecturer', header: 'Dosen', cell: (s) => s.lecturer },
    { key: 'room', header: 'Ruang', cell: (s) => s.room },
    {
      key: 'period',
      header: 'Periode',
      cell: (s) => <Badge variant={s.periodStatus === 'active' ? 'success' : s.periodStatus === 'upcoming' ? 'info' : 'muted'}>{s.periodStatusLabel}</Badge>,
    },
  ];

  return (
    <AppLayout title="Jadwal Akademik">
      <PageHeader
        title="Jadwal Akademik"
        description={`${schedules.total} jadwal kuliah`}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/pemetaan-kelas">
              Kelola di Pemetaan Kelas
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      <Alert variant="info">
        <Info aria-hidden />
        <span>Jadwal dibuat otomatis dari Pemetaan Kelas, jadi halaman ini hanya untuk dilihat. Ubah jadwal lewat Pemetaan Kelas.</span>
      </Alert>

      <Card className="gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <SelectField aria-label="Periode" className="w-52" value={filters.period_id} options={options.periods} allLabel="Semua periode" onValueChange={(v) => setFilter('period_id', v)} />
          <SelectField aria-label="Hari" className="w-36" value={filters.day} options={options.days} allLabel="Semua hari" onValueChange={(v) => setFilter('day', v)} />
          <SelectField aria-label="Kelas" className="w-36" value={filters.class_group_id} options={options.classGroups} allLabel="Semua kelas" onValueChange={(v) => setFilter('class_group_id', v)} />
          <SelectField aria-label="Dosen" className="w-60" value={filters.lecturer_id} options={options.lecturers} allLabel="Semua dosen" onValueChange={(v) => setFilter('lecturer_id', v)} />
          {isDirty && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Atur ulang
            </Button>
          )}
        </div>

        <DataTable columns={columns} rows={schedules} getRowKey={(s) => s.id} />
      </Card>
    </AppLayout>
  );
}
