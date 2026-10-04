import { Link, router } from '@inertiajs/react';
import { AlertTriangle, BookOpen, CalendarCheck, GraduationCap, MapPin, Percent, Smartphone, Users, UsersRound } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { type ChartFilterOptions, ChartFilterBar, type ChartFilters } from '@/components/dashboard/chart-filter-bar';
import { ClassChart, CourseChart, MonthlyChart, type MonthlyShare, TrendChart } from '@/components/dashboard/charts';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn, formatDate, formatNumber } from '@/lib/utils';

interface AdminDashboardProps {
  period: { label: string; start: string; end: string; week: number } | null;
  stats: { students: number; lecturers: number; courses: number; classGroups: number };
  tasks: { pendingLecturers: number; roomsWithoutPoint: number };
  attendance: {
    rate: number | null;
    today: number;
    trend: { date: string; rate: number }[];
    byCourse: { label: string; rate: number }[];
    byClass: { label: string; rate: number }[];
    monthly: MonthlyShare[];
  } | null;
  resetRequests: ResetRequest[];
  /** Filter global grafik (null bila belum ada periode aktif). */
  chartFilters: ChartFilters | null;
  chartOptions: ChartFilterOptions | null;
}

interface ResetRequest {
  id: number;
  name: string;
  nim: string | null;
  device: string | null;
  reason: string;
  createdAt: string | null;
}

/** Ambang warna peringatan pada grafik kehadiran (sesuai desain). */
const LOW_RATE = 85;

type ResetAction = { request: ResetRequest; action: 'approve' | 'reject' };

export default function AdminDashboard({ period, stats, tasks, attendance, resetRequests, chartFilters, chartOptions }: AdminDashboardProps) {
  const [pending, setPending] = useState<ResetAction | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const rangeLabel = chartOptions?.ranges.find((r) => r.value === chartFilters?.range)?.label ?? 'Seluruh semester';

  const confirmReset = () => {
    if (!pending) return;
    const path = pending.action === 'approve' ? 'setujui' : 'tolak';
    router.post(`/admin/reset-perangkat/${pending.request.id}/${path}`, {}, { preserveScroll: true, onFinish: () => setPending(null) });
  };

  return (
    <AppLayout title="Dasbor Admin">
      <PageHeader
        title="Dasbor"
        description={
          period ? (
            <>
              Universitas Pamulang ·{' '}
              <Link href="/admin/periode-akademik" className="font-semibold text-primary hover:underline">
                Periode {period.label}
              </Link>{' '}
              · Pekan ke-{period.week}
            </>
          ) : (
            'Belum ada periode akademik yang aktif.'
          )
        }
      />

      {!period && (
        <Alert variant="warning">
          <AlertTriangle aria-hidden />
          <span>
            Aktifkan satu periode di{' '}
            <Link href="/admin/periode-akademik" className="font-semibold underline">
              Periode Akademik
            </Link>{' '}
            agar sesi presensi bisa dibuka.
          </span>
        </Alert>
      )}

      {(tasks.pendingLecturers > 0 || tasks.roomsWithoutPoint > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {tasks.pendingLecturers > 0 && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-warning-soft p-5">
              <div className="flex items-center gap-3">
                <Users className="size-5 text-warning" aria-hidden />
                <p className="text-sm">
                  <strong>{tasks.pendingLecturers} pendaftaran dosen</strong> menunggu persetujuan.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/dosen?account=pending">Tinjau</Link>
              </Button>
            </div>
          )}
          {tasks.roomsWithoutPoint > 0 && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-warning-soft p-5">
              <div className="flex items-center gap-3">
                <MapPin className="size-5 text-warning" aria-hidden />
                <p className="text-sm">
                  <strong>{tasks.roomsWithoutPoint} ruang</strong> belum punya titik presensi.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/ruang?readiness=missing">Atur titik</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total Mahasiswa" value={stats.students} icon={GraduationCap} isHighlighted />
        <StatCard label="Total Dosen" value={stats.lecturers} icon={Users} />
        <StatCard label="Mata Kuliah Aktif" value={stats.courses} icon={BookOpen} />
        <StatCard label="Kelas Aktif" value={stats.classGroups} icon={UsersRound} />
      </div>

      {resetRequests.length > 0 && (
        <Card className="gap-4">
          <div className="flex items-center gap-3">
            <Smartphone className="size-5 text-primary" aria-hidden />
            <h2 className="text-lg font-bold">Permintaan reset perangkat</h2>
            <span className="rounded-full bg-amber-500 px-2 text-xs font-bold text-white">{resetRequests.length}</span>
          </div>
          <ul className="flex flex-col">
            {resetRequests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3">
                <div>
                  <p className="font-bold">
                    {r.name} <span className="font-normal text-muted-foreground">· {r.nim ?? '—'}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.reason} · {r.device ?? 'Tanpa perangkat terikat'}
                    {r.createdAt && ` · diajukan ${formatDate(r.createdAt)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-destructive hover:bg-danger-soft hover:text-destructive" onClick={() => setPending({ request: r, action: 'reject' })}>
                    Tolak
                  </Button>
                  <Button size="sm" onClick={() => setPending({ request: r, action: 'approve' })}>
                    Setujui
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {attendance && chartFilters && chartOptions && (
        <section className="flex flex-col gap-4" aria-labelledby="attendance-stats">
          <h2 id="attendance-stats" className="text-xl font-extrabold">
            Statistik kehadiran
          </h2>
          {/* Filter global: satu baris di atas semua angka & grafik yang dipengaruhinya. */}
          <ChartFilterBar url="/admin" filters={chartFilters} options={chartOptions} onLoadingChange={setIsChartLoading} />

          {/* Saat memuat ulang, tampilan lama tetap ada (diredupkan) agar tidak ada lompatan layout. */}
          <div className={cn('flex flex-col gap-4 transition-opacity', isChartLoading && 'pointer-events-none opacity-50')} aria-busy={isChartLoading}>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Tingkat Kehadiran"
                value={attendance.rate !== null ? `${formatNumber(attendance.rate, 1)}%` : '—'}
                icon={Percent}
                sub={`${rangeLabel} · hadir, terlambat & izin`}
              />
              <StatCard label="Presensi Hari Ini" value={attendance.today} icon={CalendarCheck} sub="Hadir, terlambat, dan izin" />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
              <Card>
                <ChartHeading title="Tren kehadiran" description={`Tingkat kehadiran harian · ${rangeLabel.toLowerCase()}`} />
                <TrendChart points={attendance.trend} threshold={LOW_RATE} />
              </Card>
              <Card>
                <ChartHeading title="Kehadiran per mata kuliah" description={`Kuning = di bawah ${LOW_RATE}%`} />
                <CourseChart items={attendance.byCourse} threshold={LOW_RATE} />
              </Card>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <ChartHeading title="Kehadiran per kelas" description={`Kuning = di bawah ${LOW_RATE}%`} />
                <ClassChart items={attendance.byClass} threshold={LOW_RATE} />
              </Card>
              <Card>
                <ChartHeading title="Statistik presensi bulanan" description="Porsi data per status · klik legenda untuk menyembunyikan status" />
                <MonthlyChart months={attendance.monthly} />
              </Card>
            </div>
          </div>
        </section>
      )}

      <ConfirmDialog
        isOpen={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.action === 'approve' ? `Setujui reset perangkat ${pending.request.name}?` : `Tolak permintaan ${pending?.request.name ?? ''}?`}
        description={
          pending?.action === 'approve'
            ? 'Perangkat lama dilepas. Perangkat berikutnya yang dipakai mahasiswa untuk masuk akan terikat.'
            : 'Perangkat yang terikat sekarang tetap dipakai untuk presensi.'
        }
        confirmLabel={pending?.action === 'approve' ? 'Setujui' : 'Tolak'}
        isDestructive={pending?.action === 'reject'}
        onConfirm={confirmReset}
      />
    </AppLayout>
  );
}

function ChartHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
