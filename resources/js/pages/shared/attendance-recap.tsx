import { router } from '@inertiajs/react';
import { FileDown, Printer, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { type RecapStatus, RecapStatusBadge, recapStatusInfo } from '@/components/app/recap-status-badge';
import { SelectField } from '@/components/app/select-field';
import { StatCard } from '@/components/app/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { downloadXlsx, printAsPdf, slug } from '@/lib/export';
import { cn, formatDate } from '@/lib/utils';
import type { Option } from '@/types';

type Code = 'H' | 'T' | 'I' | 'A';

interface RecapRow {
  studentId: number;
  name: string;
  nim: string;
  strip: { meetingNo: number; date: string; code: Code | null }[];
  counts: Record<Code, number>;
  percent: number | null;
  remaining: number;
  status: RecapStatus;
}

interface Recap {
  summary: {
    students: number;
    held: number;
    total: number;
    average: number | null;
    ineligible: number;
    warning: number;
    safe: number;
    isFinished: boolean;
    minPercent: number;
    maxAbsent: number;
  };
  rows: RecapRow[];
}

interface Props {
  role: 'admin' | 'lecturer';
  baseUrl: string;
  filters: { period_id: string | null; course_id: string | null; class_group_id: string | null };
  options: { periods: Option[]; courses: Option[]; classGroups: Option[] };
  schedule: { course: string; courseCode: string; classGroup: string; lecturer: string } | null;
  recap: Recap | null;
}

const PAGE_SIZE = 10;

const codeStyle: Record<Code, { cls: string; label: string }> = {
  H: { cls: 'bg-emerald-600', label: 'Hadir' },
  T: { cls: 'bg-amber-500', label: 'Terlambat' },
  I: { cls: 'bg-blue-600', label: 'Izin' },
  A: { cls: 'bg-red-600', label: 'Tidak hadir' },
};

type Chip = 'all' | 'ineligible' | 'warning' | 'safe';

export default function AttendanceRecap({ baseUrl, filters, options, schedule, recap }: Props) {
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<Chip>('all');
  const [isExporting, setIsExporting] = useState(false);

  const visit = (params: Partial<Props['filters']>) => router.get(baseUrl, { ...filters, ...params }, { preserveScroll: true, preserveState: false });

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (recap?.rows ?? [])
      .filter((r) => r.name.toLowerCase().includes(q) || r.nim.includes(q))
      .filter((r) => chip === 'all' || r.status === chip || (chip === 'safe' && r.status === 'eligible'));
  }, [recap, search, chip]);


  const columns: DataTableColumn<RecapRow>[] = [
    { key: 'no', header: 'No.', className: 'tabular-nums text-muted-foreground', cell: (r) => rows.indexOf(r) + 1 },
    {
      key: 'name',
      header: 'Mahasiswa',
      cell: (r) => (
        <>
          <p className="font-bold">{r.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{r.nim}</p>
        </>
      ),
    },
    {
      key: 'strip',
      header: `Pertemuan 1–${recap?.summary.total ?? 16}`,
      cell: (r) => (
        <div className="flex gap-0.5" aria-label={`Kehadiran per pertemuan ${r.name}`}>
          {r.strip.map((s) => (
            <span
              key={s.meetingNo}
              title={`Pertemuan ${s.meetingNo} · ${formatDate(s.date)} · ${s.code ? codeStyle[s.code].label : 'Belum'}`}
              className={cn('h-4 w-2.5 rounded-[3px]', s.code ? codeStyle[s.code].cls : 'bg-muted')}
            />
          ))}
        </div>
      ),
    },
    ...(['H', 'T', 'I', 'A'] as Code[]).map(
      (c): DataTableColumn<RecapRow> => ({
        key: c,
        header: c,
        align: 'right',
        className: (r) => cn('tabular-nums', c === 'A' && r.counts.A > 0 && 'font-bold text-destructive'),
        cell: (r) => r.counts[c],
      }),
    ),
    {
      key: 'percent',
      header: 'Kehadiran',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full', (r.percent ?? 0) >= (recap?.summary.minPercent ?? 75) ? 'bg-emerald-600' : 'bg-amber-500')}
              style={{ width: `${r.percent ?? 0}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums">{r.percent !== null ? `${r.percent}%` : '—'}</span>
        </div>
      ),
    },
    {
      key: 'remaining',
      header: 'Sisa jatah absen',
      className: (r) => cn('font-semibold', r.remaining < 0 ? 'text-destructive' : r.remaining <= 1 ? 'text-warning' : ''),
      cell: (r) => (r.remaining < 0 ? `Lewat ${Math.abs(r.remaining)} kali` : `${r.remaining} kali`),
    },
    { key: 'status', header: 'Status', cell: (r) => <RecapStatusBadge status={r.status} /> },
  ];

  const exportExcel = async () => {
    if (!recap || !schedule) return;
    setIsExporting(true);
    try {
      await downloadXlsx(`rekap-${slug(schedule.courseCode)}-${slug(schedule.classGroup)}`, 'Rekap', {
        title: [
          'Rekap Kehadiran',
          `${schedule.course} (${schedule.courseCode}) · ${schedule.classGroup} · ${schedule.lecturer}`,
          `Pertemuan terlaksana ${recap.summary.held}/${recap.summary.total} · batas minimal ${recap.summary.minPercent}% (maks. ${recap.summary.maxAbsent} kali tidak hadir)`,
        ],
        headers: ['No.', 'NIM', 'Nama', ...recap.rows[0]!.strip.map((s) => `P${s.meetingNo}`), 'H', 'T', 'I', 'A', 'Kehadiran (%)', 'Sisa jatah', 'Status'],
        rows: recap.rows.map((r, i) => [
          i + 1,
          r.nim,
          r.name,
          ...r.strip.map((s) => s.code ?? '-'),
          r.counts.H,
          r.counts.T,
          r.counts.I,
          r.counts.A,
          r.percent,
          r.remaining,
          recapStatusInfo[r.status].label,
        ]),
        widths: [6, 15, 28, ...recap.rows[0]!.strip.map(() => 5), 5, 5, 5, 5, 14, 11, 16],
      });
    } finally {
      setIsExporting(false);
    }
  };

  const summary = recap?.summary;
  const chips: { key: Chip; label: string; count: number }[] = summary
    ? [
        { key: 'all', label: 'Semua', count: summary.students },
        { key: 'ineligible', label: 'Tidak memenuhi', count: summary.ineligible },
        { key: 'warning', label: 'Waspada', count: summary.warning },
        { key: 'safe', label: summary.isFinished ? 'Memenuhi' : 'Aman', count: summary.safe },
      ]
    : [];

  return (
    <AppLayout title="Rekap Kehadiran">
      <PageHeader
        title="Rekap Kehadiran"
        description="Kehadiran per mahasiswa dalam satu periode, dan kelayakan ikut UAS."
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={exportExcel} disabled={!recap || recap.rows.length === 0 || isExporting}>
              <FileDown aria-hidden />
              {isExporting ? 'Menyiapkan…' : 'Ekspor Excel'}
            </Button>
            <Button onClick={printAsPdf} disabled={!recap || recap.rows.length === 0}>
              <Printer aria-hidden />
              Ekspor PDF
            </Button>
          </div>
        }
      />

      <Card className="grid gap-4 p-5 sm:grid-cols-3 print:hidden">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Periode
          <SelectField aria-label="Periode" value={filters.period_id ?? undefined} options={options.periods} onValueChange={(v) => visit({ period_id: v, course_id: null, class_group_id: null })} />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Mata kuliah
          <SelectField aria-label="Mata kuliah" value={filters.course_id ?? undefined} options={options.courses} placeholder="Tidak ada mata kuliah" onValueChange={(v) => visit({ course_id: v, class_group_id: null })} />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Kelas
          <SelectField aria-label="Kelas" value={filters.class_group_id ?? undefined} options={options.classGroups} placeholder="Tidak ada kelas" onValueChange={(v) => visit({ class_group_id: v })} />
        </label>
      </Card>

      {!recap || !summary || !schedule ? (
        <Card className="items-center py-12 text-sm text-muted-foreground">Belum ada pemetaan untuk pilihan ini.</Card>
      ) : (
        <>
          <div className="hidden print:block">
            <h2 className="text-xl font-extrabold">
              Rekap Kehadiran · {schedule.course} · {schedule.classGroup}
            </h2>
            <p className="text-sm">{schedule.lecturer}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
            <StatCard label="Mahasiswa" value={summary.students} sub={`${schedule.classGroup} · ${schedule.course}`} isHighlighted />
            <StatCard label="Pertemuan terlaksana" value={`${summary.held}/${summary.total}`} sub={summary.isFinished ? 'Semester selesai' : 'Semester berjalan'} />
            <StatCard label="Rata-rata kehadiran" value={summary.average !== null ? `${summary.average}%` : '—'} sub="Hadir + terlambat + izin" />
            <StatCard label="Tidak memenuhi" value={summary.ineligible} sub={`Tidak hadir > ${summary.maxAbsent} kali`} tone={summary.ineligible > 0 ? 'warning' : 'default'} />
            <StatCard label={summary.isFinished ? 'Memenuhi' : 'Waspada'} value={summary.isFinished ? summary.safe : summary.warning} sub={summary.isFinished ? 'Boleh ikut UAS' : 'Sisa jatah absen ≤ 1'} />
          </div>

          <Card className="gap-4">
            <div className="flex flex-col gap-2 text-sm">
              <p>
                Batas minimal <strong>{summary.minPercent}%</strong> dari {summary.total} pertemuan · maks. <strong>{summary.maxAbsent} kali</strong> tidak hadir tanpa izin · izin/sakit
                yang disetujui dihitung hadir.
              </p>
              <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-label="Legenda">
                {(Object.keys(codeStyle) as Code[]).map((c) => (
                  <li key={c} className="flex items-center gap-1.5">
                    <span className={cn('size-2.5 rounded-sm', codeStyle[c].cls)} />
                    {codeStyle[c].label}
                  </li>
                ))}
                <li className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-muted" />
                  Belum
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <div className="relative min-w-60 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau NIM"
                  aria-label="Cari nama atau NIM"
                  className="pl-9"
                />
              </div>
              <div className="flex rounded-full bg-muted p-1" role="group" aria-label="Saring status">
                {chips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={chip === c.key}
                    onClick={() => setChip(c.key)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                      chip === c.key && 'bg-white text-primary shadow-sm',
                    )}
                  >
                    {c.label} · {c.count}
                  </button>
                ))}
              </div>
            </div>

            {/* Paginasi klien di dalam DataTable; saat dicetak semua baris tetap ikut. */}
            <DataTable columns={columns} rows={rows} getRowKey={(r) => r.studentId} emptyMessage="Tidak ada mahasiswa yang cocok." pageSize={PAGE_SIZE} itemLabel="mahasiswa" />
          </Card>
        </>
      )}
    </AppLayout>
  );
}
