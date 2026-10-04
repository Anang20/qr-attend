import { type RecapStatus, RecapStatusBadge } from '@/components/app/recap-status-badge';
import { cn } from '@/lib/utils';

/** Rekap satu mata kuliah untuk mahasiswa (AttendanceRecap::forStudent). */
export interface CourseRecap {
  course: string;
  percent: number | null;
  absent: number;
  remaining: number;
  status: RecapStatus;
}

/** Kartu kelayakan UAS per mata kuliah — dipakai di Beranda & Riwayat mahasiswa. */
export function CourseRecapList({ items }: { items: CourseRecap[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((c) => {
        const isSafe = c.status === 'safe' || c.status === 'eligible';
        return (
          <li key={c.course} className={cn('flex flex-col gap-2 rounded-xl border p-4', c.status === 'warning' && 'border-amber-200', c.status === 'ineligible' && 'border-red-200')}>
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold">{c.course}</span>
              <RecapStatusBadge status={c.status} />
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className={cn('h-full rounded-full', isSafe ? 'bg-primary' : 'bg-amber-500')} style={{ width: `${c.percent ?? 0}%` }} />
            </div>
            <span className="text-sm text-muted-foreground">
              Kehadiran <strong className="text-foreground">{c.percent !== null ? `${c.percent}%` : '—'}</strong> · tidak hadir {c.absent} · sisa jatah {c.remaining}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
