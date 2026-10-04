import { Link } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatNumber } from '@/lib/utils';
import type { SessionSummary } from '@/types';

interface Props {
  session: SessionSummary;
  attendance: { id: number; status: string; statusLabel: string; method: string; time: string; date: string; distance: number | null; accuracy: number | null };
}

export default function ScanSuccess({ session, attendance }: Props) {
  const isLate = attendance.status === 'late';

  const rows = [
    ['Mata kuliah', session.course],
    ['Kelas', session.classGroup],
    ['Pertemuan', String(session.meetingNo)],
    ['Tanggal', formatDate(attendance.date)],
    ['Waktu', attendance.time],
    ['Metode', attendance.method],
    ['Jarak dari titik', attendance.distance !== null ? `${formatNumber(attendance.distance, 1)} m` : '—'],
  ];

  return (
    <AppLayout title="Presensi Berhasil">
      <Card className="mx-auto w-full max-w-lg items-center gap-5 py-10 text-center">
        <span className={isLate ? 'flex size-16 items-center justify-center rounded-full bg-warning-soft text-warning' : 'flex size-16 items-center justify-center rounded-full bg-secondary text-success'}>
          <CheckCircle2 className="size-9" aria-hidden />
        </span>
        <div>
          <h1 className="text-3xl font-extrabold">Presensi Berhasil</h1>
          <p className="text-muted-foreground">Anda tercatat {attendance.statusLabel.toLowerCase()}.</p>
        </div>
        <dl className="w-full divide-y rounded-2xl border text-left text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <Button asChild className="w-full">
          <Link href="/mahasiswa/kelas-hari-ini">Kembali ke Kelas Hari Ini</Link>
        </Button>
        <Button asChild variant="outline" className="-mt-2 w-full">
          <Link href={`/mahasiswa/riwayat/${attendance.id}`}>Lihat di riwayat</Link>
        </Button>
      </Card>
    </AppLayout>
  );
}
