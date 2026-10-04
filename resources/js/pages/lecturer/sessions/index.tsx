import { Link } from '@inertiajs/react';

import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { SelectField } from '@/components/app/select-field';
import { SessionStatusBadge } from '@/components/app/session-status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFilters } from '@/hooks/use-filters';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/utils';
import type { Filters, Option, Paginated, SessionSummary } from '@/types';

interface SessionRow extends SessionSummary {
  attended: number;
  records: number;
}

interface Props {
  period: string | null;
  sessions: Paginated<SessionRow>;
  filters: Filters;
  classOptions: Option[];
}

const URL = '/dosen/presensi';

export default function LecturerSessionsIndex({ period, sessions, filters: initialFilters, classOptions }: Props) {
  const { filters, setFilter } = useFilters(URL, initialFilters);
  const isPast = filters.when === 'past';


  const columns: DataTableColumn<SessionRow>[] = [
    {
      key: 'date',
      header: 'Tanggal',
      className: 'whitespace-nowrap',
      cell: (s) => (
        <>
          <p className="font-semibold">{formatDate(s.date)}</p>
          <p className="text-xs text-muted-foreground">
            {s.day}, {s.startTime}–{s.endTime}
          </p>
        </>
      ),
    },
    {
      key: 'course',
      header: 'Mata kuliah',
      cell: (s) => (
        <>
          <p className="font-bold">{s.course}</p>
          <p className="text-xs text-muted-foreground">{s.room}</p>
        </>
      ),
    },
    { key: 'class', header: 'Kelas', cell: (s) => s.classGroup },
    { key: 'meeting', header: 'Pertemuan', className: 'tabular-nums', cell: (s) => `${s.meetingNo}/16` },
    { key: 'status', header: 'Status', cell: (s) => <SessionStatusBadge status={s.status} /> },
    // Jumlah hadir hanya relevan untuk pertemuan yang sudah lewat.
    ...(isPast
      ? [{ key: 'attended', header: 'Hadir', align: 'right', className: 'tabular-nums', cell: (s) => `${s.attended}/${s.records}` } satisfies DataTableColumn<SessionRow>]
      : []),
    {
      key: 'actions',
      header: 'Aksi',
      isHeaderHidden: true,
      headClassName: 'w-28',
      cell: (s) => (
        <Button asChild size="sm" variant="outline">
          <Link href={`/dosen/presensi/${s.id}`}>Buka</Link>
        </Button>
      ),
    },
  ];

  return (
    <AppLayout title="Presensi">
      <PageHeader title="Presensi" description={period ? `Pertemuan Anda di periode ${period}` : 'Belum ada periode aktif.'} />

      <Card className="gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={filters.when ?? 'upcoming'} onValueChange={(v) => setFilter('when', v)}>
            <TabsList className="w-72">
              <TabsTrigger value="upcoming">Hari ini & mendatang</TabsTrigger>
              <TabsTrigger value="past">Sudah lewat</TabsTrigger>
            </TabsList>
          </Tabs>
          <SelectField aria-label="Kelas" className="w-40" value={filters.class_group_id} options={classOptions} allLabel="Semua kelas" onValueChange={(v) => setFilter('class_group_id', v)} />
        </div>

        <DataTable columns={columns} rows={sessions} getRowKey={(s) => s.id} emptyMessage="Tidak ada pertemuan." />
      </Card>
    </AppLayout>
  );
}
