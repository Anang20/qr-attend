import { Link } from '@inertiajs/react';
import { ScanLine } from 'lucide-react';

import { PageHeader } from '@/components/app/page-header';
import { AttendanceBadge, SessionStatusBadge } from '@/components/app/session-status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCountdown } from '@/hooks/use-countdown';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/utils';
import type { SessionSummary } from '@/types';

interface TodaySession extends SessionSummary {
  expiresAt: string | null;
  myStatus: string | null;
  myStatusLabel: string | null;
  myTime: string | null;
  attendanceId: number | null;
}

interface Props {
  classGroup: string;
  date: string;
  sessions: TodaySession[];
  serverNow: string;
}

export default function Today({ classGroup, date, sessions, serverNow }: Props) {
  return (
    <AppLayout title="Kelas Hari Ini">
      <PageHeader title="Kelas Hari Ini" description={`${classGroup} · ${formatDate(date)}`} />

      {sessions.length === 0 && <Card className="text-sm text-muted-foreground">Tidak ada kuliah hari ini.</Card>}

      <div className="flex flex-col gap-3">
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} serverNow={serverNow} />
        ))}
      </div>
    </AppLayout>
  );
}

function SessionCard({ session: s, serverNow }: { session: TodaySession; serverNow: string }) {
  const isOpen = s.status === 'open';
  const { label, isExpired } = useCountdown(isOpen ? s.expiresAt : null, serverNow);
  const canScan = isOpen && !isExpired && !s.myStatus;

  return (
    <Card className={canScan ? 'gap-4 border-transparent bg-brand-deep text-white' : 'gap-4'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{s.course}</p>
          <p className={canScan ? 'text-sm text-emerald-100/80' : 'text-sm text-muted-foreground'}>
            {s.startTime}–{s.endTime} · {s.room} · Pertemuan {s.meetingNo}
          </p>
          <p className={canScan ? 'text-sm text-emerald-100/80' : 'text-sm text-muted-foreground'}>{s.lecturer}</p>
        </div>
        {s.myStatus ? <AttendanceBadge status={s.myStatus} /> : <SessionStatusBadge status={isOpen && isExpired ? 'expired' : s.status} />}
      </div>

      {canScan && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            Presensi dibuka · sisa <span className="text-2xl font-extrabold tabular-nums">{label}</span>
          </p>
          <Button asChild variant="secondary" size="lg">
            <Link href="/mahasiswa/pindai">
              <ScanLine aria-hidden />
              Pindai QR Code
            </Link>
          </Button>
        </div>
      )}
      {s.myStatus && s.myTime && (
        <p className="text-sm text-muted-foreground">
          Tercatat {s.myStatusLabel} pukul {s.myTime}.
        </p>
      )}
    </Card>
  );
}
