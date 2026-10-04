import { Link } from '@inertiajs/react';

import { AttendanceBadge } from '@/components/app/session-status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn, formatNumber } from '@/lib/utils';
import type { SessionSummary } from '@/types';

interface Props {
  session: SessionSummary;
  attendance: {
    status: string;
    statusLabel: string;
    method: string;
    time: string | null;
    distance: number | null;
    radius: number | null;
  };
  timeline: { title: string; detail: string }[];
}

const longDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default function AttendanceDetail({ session, attendance, timeline }: Props) {
  const rows: [string, string][] = [
    ['Kelas', session.classGroup],
    ['Jadwal', `${session.startTime} – ${session.endTime}`],
    ['Ruang', session.room],
    ['Dosen', session.lecturer],
    ['Waktu presensi', attendance.time ?? '—'],
    ['Metode', attendance.time ? attendance.method : '—'],
  ];
  if (attendance.distance !== null) {
    rows.push(['Jarak dari titik', `${formatNumber(attendance.distance, 1)} m${attendance.radius ? ` (batas ${attendance.radius} m)` : ''}`]);
  }

  return (
    <AppLayout title={`${session.course} · Pertemuan ${session.meetingNo}`}>
      <div className="flex flex-col gap-2">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link href="/mahasiswa/riwayat" className="hover:underline">
            Riwayat Presensi
          </Link>
          <span aria-hidden> / </span>
          <span className="font-bold text-foreground" aria-current="page">
            Detail
          </span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold md:text-3xl">
            {session.course} · Pertemuan {session.meetingNo}
          </h1>
          <AttendanceBadge status={attendance.status} />
        </div>
        <p className="text-muted-foreground">{longDate.format(new Date(`${session.date}T00:00:00`))}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="gap-0 py-2">
          <dl>
            {rows.map(([label, value], i) => (
              <div key={label} className={cn('flex justify-between gap-4 py-3.5 text-sm', i > 0 && 'border-t')}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Linimasa</h2>
          <ol className="flex flex-col">
            {timeline.map((t, i) => {
              const isLast = i === timeline.length - 1;
              return (
                <li key={`${t.title}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {!isLast && <span className="absolute top-4 left-[5px] h-full w-0.5 bg-emerald-200" aria-hidden />}
                  <span className={cn('relative mt-1.5 size-3 shrink-0 rounded-full', isLast ? 'bg-primary' : 'bg-emerald-300')} aria-hidden />
                  <div>
                    <p className="font-bold">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <Button asChild variant="outline" className="w-fit">
            <Link href="/mahasiswa/riwayat">Kembali ke riwayat</Link>
          </Button>
        </Card>
      </div>
    </AppLayout>
  );
}
