import { Link, usePage } from '@inertiajs/react';
import { CalendarDays, GraduationCap, Percent, QrCode } from 'lucide-react';

import { PageHeader } from '@/components/app/page-header';
import { SessionStatusBadge } from '@/components/app/session-status-badge';
import { StatCard } from '@/components/app/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCountdown } from '@/hooks/use-countdown';
import AppLayout from '@/layouts/app-layout';
import { formatNumber } from '@/lib/utils';
import type { SessionSummary, SharedProps } from '@/types';

interface TodaySession extends SessionSummary {
  cannotOpenReason: string | null;
}

interface ActiveSession extends SessionSummary {
  expiresAt: string | null;
  recorded: number;
  total: number;
}

interface Props {
  period: string | null;
  today: TodaySession[];
  activeSession: ActiveSession | null;
  stats: { classesToday: number; students: number; attendanceRate: number | null };
  serverNow: string;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export default function LecturerDashboard({ period, today, activeSession, stats, serverNow }: Props) {
  const { auth } = usePage<SharedProps>().props;
  const firstName = auth.user?.name.split(',')[0] ?? '';

  return (
    <AppLayout title="Dasbor Dosen">
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={period ? `Periode ${period}` : 'Belum ada periode aktif.'}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dosen/jadwal">Lihat Jadwal</Link>
            </Button>
            {activeSession && (
              <Button asChild>
                <Link href={`/dosen/presensi/${activeSession.id}`}>
                  <QrCode aria-hidden />
                  Buka QR Aktif
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Kelas Hari Ini" value={stats.classesToday} icon={CalendarDays} isHighlighted />
        <StatCard label="Sesi Aktif" value={activeSession ? 1 : 0} sub={activeSession ? 'Live' : 'Tidak ada'} icon={QrCode} />
        <StatCard label="Total Mahasiswa" value={stats.students} icon={GraduationCap} />
        <StatCard label="Tingkat Kehadiran" value={stats.attendanceRate !== null ? `${formatNumber(stats.attendanceRate, 1)}%` : '—'} sub="Periode berjalan" icon={Percent} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Jadwal Hari Ini</CardTitle>
            <CardDescription>Presensi hanya bisa dimulai pada jam kuliah yang dijadwalkan.</CardDescription>
          </CardHeader>
          {today.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada jadwal mengajar hari ini.</p>}
          <ul className="flex flex-col gap-3">
            {today.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{s.course}</p>
                    <SessionStatusBadge status={s.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.classGroup} · {s.startTime}–{s.endTime} · {s.room} · Pertemuan {s.meetingNo}
                  </p>
                  {s.status === 'scheduled' && s.cannotOpenReason && <p className="text-xs text-warning">{s.cannotOpenReason}</p>}
                </div>
                <Button asChild size="sm" variant={s.status === 'open' ? 'default' : 'outline'}>
                  <Link href={`/dosen/presensi/${s.id}`}>{s.status === 'open' ? 'Buka QR' : s.status === 'scheduled' ? 'Mulai Presensi' : 'Lihat sesi'}</Link>
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        {activeSession ? <ActiveCard session={activeSession} serverNow={serverNow} /> : null}
      </div>
    </AppLayout>
  );
}

function ActiveCard({ session, serverNow }: { session: ActiveSession; serverNow: string }) {
  const { label } = useCountdown(session.expiresAt, serverNow);
  const percent = session.total > 0 ? Math.round((session.recorded / session.total) * 100) : 0;

  return (
    <Card className="border-transparent bg-brand-deep text-white">
      <p className="text-xs font-bold tracking-widest text-emerald-200">SESI BERLANGSUNG</p>
      <div>
        <p className="text-lg font-bold">{session.course}</p>
        <p className="text-sm text-emerald-100/80">
          {session.classGroup} · {session.room}
        </p>
      </div>
      <p className="text-5xl font-extrabold tabular-nums" aria-live="polite">
        {label}
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-emerald-400" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm text-emerald-100/90">
        {session.recorded} dari {session.total} mahasiswa sudah presensi
      </p>
      <Button asChild variant="secondary">
        <Link href={`/dosen/presensi/${session.id}`}>Buka QR</Link>
      </Button>
    </Card>
  );
}
