import { router } from '@inertiajs/react';
import { FileDown, Printer } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { AttendanceBadge } from '@/components/app/session-status-badge';
import { SelectField } from '@/components/app/select-field';
import { StatCard } from '@/components/app/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ALL } from '@/hooks/use-filters';
import AppLayout from '@/layouts/app-layout';
import { downloadXlsx, printAsPdf } from '@/lib/export';
import { formatDate } from '@/lib/utils';
import type { Option } from '@/types';

interface ReportRow {
  nim: string;
  name: string;
  time: string | null;
  method: string | null;
  status: string;
  statusLabel: string;
}

interface Report {
  meta: {
    reference: string;
    period: string;
    course: string;
    courseCode: string;
    classGroup: string;
    lecturer: string;
    room: string;
    date: string;
    day: string;
    time: string;
    meetingNo: number;
    qrWindow: string;
    generatedBy: string;
    generatedAt: string;
  };
  tiles: { total: number; present: number; late: number; absent: number; excused: number; rate: number };
  rows: ReportRow[];
}

interface Filters {
  period_id: string | null;
  lecturer_id: string | null;
  course_id: string | null;
  class_group_id: string | null;
  session_id: string | null;
  status: string | null;
}

interface Props {
  filters: Filters;
  options: { periods: Option[]; lecturers: Option[]; courses: Option[]; classGroups: Option[]; sessions: Option[]; statuses: Option[] };
  report: Report | null;
}

const URL = '/admin/laporan-presensi';

const columns: DataTableColumn<ReportRow & { no: number }>[] = [
  { key: 'no', header: 'No.', className: 'tabular-nums text-muted-foreground', cell: (r) => r.no },
  { key: 'nim', header: 'NIM', className: 'tabular-nums', cell: (r) => r.nim },
  { key: 'name', header: 'Nama mahasiswa', className: 'font-semibold', cell: (r) => r.name },
  { key: 'time', header: 'Waktu presensi', className: 'tabular-nums', cell: (r) => r.time ?? '—' },
  { key: 'method', header: 'Metode', cell: (r) => r.method ?? '—' },
  { key: 'status', header: 'Status', cell: (r) => <AttendanceBadge status={r.status} /> },
];

export default function Reports({ filters: initial, options, report }: Props) {
  // Filter diterapkan lewat tombol "Terapkan" (bukan otomatis), sesuai desain.
  const [filters, setFilters] = useState<Filters>(initial);
  const [isExporting, setIsExporting] = useState(false);

  const change = (key: keyof Filters, value: string) => {
    const v = value === ALL ? null : value;
    // Pilihan bertingkat: mengubah induk mengosongkan pilihan turunan.
    const cascade: Record<keyof Filters, (keyof Filters)[]> = {
      period_id: ['lecturer_id', 'course_id', 'class_group_id', 'session_id'],
      lecturer_id: ['course_id', 'class_group_id', 'session_id'],
      course_id: ['class_group_id', 'session_id'],
      class_group_id: ['session_id'],
      session_id: [],
      status: [],
    };
    const next = { ...filters, [key]: v };
    cascade[key].forEach((k) => (next[k] = null));
    setFilters(next);
    // Pilihan induk perlu data opsi baru dari server.
    if (cascade[key].length > 0) apply(next);
  };

  const apply = (f: Filters = filters) => {
    const query = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== null && v !== ''));
    router.get(URL, query, { preserveScroll: true });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    apply();
  };

  const reset = () => router.get(URL, {}, { preserveScroll: true });

  const rows = (report?.rows ?? []).map((r, i) => ({ ...r, no: i + 1 }));
  const hasData = rows.length > 0;

  const exportExcel = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      const m = report.meta;
      await downloadXlsx(m.reference, 'Laporan', {
        title: [
          'Universitas Pamulang · Fakultas Ilmu Komputer',
          `LAPORAN PRESENSI · ${m.period} · No. ${m.reference}`,
          `${m.course} (${m.courseCode}) · ${m.classGroup} · ${m.lecturer}`,
          `${m.day}, ${formatDate(m.date)} · ${m.time} · Pertemuan ${m.meetingNo} · Jendela QR ${m.qrWindow}`,
        ],
        headers: ['No.', 'NIM', 'Nama mahasiswa', 'Waktu presensi', 'Metode', 'Status'],
        rows: rows.map((r) => [r.no, r.nim, r.name, r.time, r.method, r.statusLabel]),
        widths: [6, 16, 30, 16, 12, 14],
      });
    } finally {
      setIsExporting(false);
    }
  };

  const field = (key: keyof Filters, label: string, opts: Option[], allLabel?: string) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`f-${key}`}>{label}</Label>
      <SelectField id={`f-${key}`} value={filters[key] ?? undefined} options={opts} allLabel={allLabel} placeholder={opts.length === 0 ? 'Tidak ada data' : 'Pilih…'} onValueChange={(v) => change(key, v)} />
    </div>
  );

  return (
    <AppLayout title="Laporan Presensi">
      <PageHeader
        title="Laporan Presensi"
        description="Saring, pratinjau, dan ekspor rekap presensi resmi."
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={exportExcel} disabled={!hasData || isExporting}>
              <FileDown aria-hidden />
              {isExporting ? 'Menyiapkan…' : 'Ekspor Excel'}
            </Button>
            <Button onClick={printAsPdf} disabled={!hasData}>
              <Printer aria-hidden />
              Ekspor PDF
            </Button>
          </div>
        }
      />

      <Card className="print:hidden">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            {field('period_id', 'Periode', options.periods)}
            {field('session_id', 'Tanggal', options.sessions)}
            {field('course_id', 'Mata kuliah', options.courses)}
            {field('class_group_id', 'Kelas', options.classGroups)}
            {field('lecturer_id', 'Dosen', options.lecturers, 'Semua dosen')}
            {field('status', 'Status', options.statuses, 'Semua')}
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={reset}>
              Atur ulang
            </Button>
            <Button type="submit" variant="secondary">
              Terapkan
            </Button>
          </div>
        </form>
      </Card>

      {!report ? (
        <Card className="items-center py-12 text-sm text-muted-foreground">Belum ada pertemuan yang terlaksana untuk pilihan ini.</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6 print:hidden">
            <StatCard label="Total mahasiswa" value={report.tiles.total} />
            <StatCard label="Hadir" value={report.tiles.present} />
            <StatCard label="Terlambat" value={report.tiles.late} />
            <StatCard label="Tidak hadir" value={report.tiles.absent} />
            <StatCard label="Izin" value={report.tiles.excused} />
            <StatCard label="Tingkat kehadiran" value={`${report.tiles.rate}%`} isHighlighted />
          </div>

          {/* Pratinjau cetak = isi PDF. */}
          <Card className="gap-5 print:border-0 print:p-0">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-brand-deep pb-4">
              <div className="flex items-center gap-4">
                <span className="flex size-14 items-center justify-center rounded-xl border border-dashed text-[10px] font-bold text-muted-foreground">LOGO</span>
                <div>
                  <p className="text-xl font-extrabold">Universitas Pamulang</p>
                  <p className="text-sm text-muted-foreground">Fakultas Ilmu Komputer · Program Studi Sistem Informasi</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold tracking-wide">LAPORAN PRESENSI</p>
                <p className="text-xs text-muted-foreground">
                  {report.meta.period} · No. {report.meta.reference}
                </p>
              </div>
            </header>

            <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
              {[
                ['Mata kuliah', `${report.meta.course} (${report.meta.courseCode})`],
                ['Kelas', report.meta.classGroup],
                ['Dosen', report.meta.lecturer],
                ['Tanggal', `${report.meta.day}, ${formatDate(report.meta.date)}`],
                ['Jadwal', `${report.meta.time} · Pertemuan ${report.meta.meetingNo}`],
                ['Jendela QR', report.meta.qrWindow],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt>
                  <dd className="font-bold">{v}</dd>
                </div>
              ))}
            </dl>

            <DataTable columns={columns} rows={rows} getRowKey={(r) => r.nim} emptyMessage="Tidak ada mahasiswa dengan status ini." pageSize={15} itemLabel="mahasiswa" />

            <footer className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Dibuat {formatDate(report.meta.generatedAt)} oleh {report.meta.generatedBy} · QR Attend
              </span>
              <span>{rows.length} baris</span>
            </footer>
          </Card>
        </>
      )}
    </AppLayout>
  );
}
