import { Link, router, useForm, usePage, usePoll } from '@inertiajs/react';
import { ArrowLeft, ClipboardEdit, ExternalLink, MapPin, Play, QrCode, Save } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef } from 'react';

import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { AttendanceBadge, SessionStatusBadge } from '@/components/app/session-status-badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCountdown } from '@/hooks/use-countdown';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatNumber } from '@/lib/utils';
import type { Paginated, SessionSummary } from '@/types';

interface SessionDetail extends SessionSummary {
  openedAt: string | null;
  expiresAt: string | null;
  validityMinutes: number;
  cannotOpenReason: string | null;
  allowManual: boolean;
  point: { latitude: number | null; longitude: number | null; radius: number; accuracy: number | null; setAt: string | null };
}

interface LiveRow {
  studentId: number;
  nim: string;
  name: string;
  status: string | null;
  statusLabel: string | null;
  method: string | null;
  time: string | null;
  distance: number | null;
}

interface Live {
  rows: Paginated<LiveRow>;
  counts: { total: number; present: number; late: number; excused: number; absent: number; notYet: number };
}

interface Props {
  session: SessionDetail;
  qrPayload: string | null;
  live: Live;
  serverNow: string;
  /** Alat uji: tampilkan isi QR sebagai teks (APP_DEBUG + ATTENDANCE_DEV_TOOLS). */
  devTools: boolean;
}

const POLL_MS = 3000;

export default function LecturerSessionShow({ session, qrPayload, live, serverNow, devTools }: Props) {
  const { errors } = usePage<{ errors: Record<string, string> }>().props;
  const isOpen = session.status === 'open';
  const openForm = useForm({});
  const finishForm = useForm({});

  return (
    <AppLayout title={`${session.course} · Pertemuan ${session.meetingNo}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href="/dosen/presensi" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <ArrowLeft className="size-4" aria-hidden />
            Semua pertemuan
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">{session.course}</h1>
            <SessionStatusBadge status={session.status} />
          </div>
          <p className="text-muted-foreground">
            {session.classGroup} · Pertemuan {session.meetingNo} · {session.day}, {formatDate(session.date)} · {session.startTime}–{session.endTime} · {session.room}
          </p>
        </div>
        {session.allowManual && ['open', 'expired', 'closed'].includes(session.status) && (
          <Button asChild variant="outline">
            <Link href={`/dosen/presensi/${session.id}/manual`}>
              <ClipboardEdit aria-hidden />
              Presensi manual
            </Link>
          </Button>
        )}
      </div>

      {session.status === 'scheduled' && (
        <StartPanel session={session} onStart={() => openForm.post(`/dosen/presensi/${session.id}/buka`, { preserveScroll: true })} isProcessing={openForm.processing} error={errors.session} />
      )}

      {session.status === 'missed' && <Alert variant="destructive">Jam kuliah pertemuan ini sudah lewat dan sesi presensi tidak pernah dibuka.</Alert>}

      {isOpen && qrPayload && <ActiveQr session={session} qrPayload={qrPayload} serverNow={serverNow} devTools={devTools} />}

      {(session.status === 'expired' || session.status === 'closed') && (
        <Card className="flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-bold">{session.status === 'expired' ? 'Sesi presensi ini sudah berakhir' : 'Rekap pertemuan sudah disimpan'}</p>
            <p className="text-sm text-muted-foreground">
              QR tidak berlaku lagi. Mahasiswa yang belum presensi tercatat Tidak Hadir; ubah lewat presensi manual bila perlu.
            </p>
          </div>
          {session.status === 'expired' && (
            <Button onClick={() => finishForm.post(`/dosen/presensi/${session.id}/selesai`, { preserveScroll: true })} disabled={finishForm.processing}>
              <Save aria-hidden />
              Simpan rekap sesi
            </Button>
          )}
        </Card>
      )}

      {session.status !== 'scheduled' && session.status !== 'missed' && <LiveTable live={live} isLive={isOpen} />}
    </AppLayout>
  );
}

function StartPanel({ session, onStart, isProcessing, error }: { session: SessionDetail; onStart: () => void; isProcessing: boolean; error?: string }) {
  const { point } = session;
  const hasPoint = point.latitude !== null && point.longitude !== null;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader>
          <CardTitle>Mulai presensi</CardTitle>
          <CardDescription>QR berlaku {session.validityMinutes} menit dan hanya dibuat sekali per sesi. Tayangkan di layar kelas.</CardDescription>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-3">
          {[
            ['Mata kuliah', session.course],
            ['Kelas', session.classGroup],
            ['Ruang', session.room],
            ['Jadwal', `${session.startTime}–${session.endTime}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-muted/60 p-4">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        {(error ?? session.cannotOpenReason) && <Alert variant="warning">{error ?? session.cannotOpenReason}</Alert>}
        <Button size="lg" onClick={onStart} disabled={isProcessing || session.cannotOpenReason !== null}>
          <Play aria-hidden />
          {isProcessing ? 'Membuka…' : 'Mulai Presensi'}
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" aria-hidden />
            Lokasi presensi
          </CardTitle>
          <CardDescription>
            Mahasiswa harus berada dalam radius {point.radius} meter dari titik {session.room}.
          </CardDescription>
        </CardHeader>
        {hasPoint ? (
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-mono text-xs">
              {point.latitude?.toFixed(7)}, {point.longitude?.toFixed(7)}
            </span>
            <span className="text-muted-foreground">
              {point.accuracy !== null && `akurasi ±${formatNumber(point.accuracy, 1)} m`}
              {point.setAt && ` · diatur ${formatDate(point.setAt)}`}
            </span>
            <a href={`https://www.google.com/maps?q=${point.latitude},${point.longitude}`} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
              <ExternalLink className="size-4" aria-hidden />
              Lihat di Google Maps
            </a>
          </div>
        ) : (
          <Alert variant="warning">Ruang belum punya titik presensi. Hubungi admin.</Alert>
        )}
      </Card>
    </div>
  );
}

function ActiveQr({ session, qrPayload, serverNow, devTools }: { session: SessionDetail; qrPayload: string; serverNow: string; devTools: boolean }) {
  const { label, isExpired, remainingMs } = useCountdown(session.expiresAt, serverNow);
  const hasReloaded = useRef(false);

  // Daftar presensi diperbarui tiap 3 detik selama sesi dibuka.
  usePoll(POLL_MS, { only: ['live', 'session', 'qrPayload', 'serverNow'] });

  // Saat hitung mundur habis, muat ulang agar server menandai sesi Kedaluwarsa.
  useEffect(() => {
    if (isExpired && !hasReloaded.current) {
      hasReloaded.current = true;
      router.reload();
    }
  }, [isExpired]);

  const totalMs = session.validityMinutes * 60 * 1000;
  const percent = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));

  return (
    <Card className="items-center gap-6 py-10 text-center">
      <div className="flex flex-col items-center gap-1">
        <p className="flex items-center gap-2 text-sm font-bold tracking-widest text-primary">
          <QrCode className="size-4" aria-hidden />
          SESI PRESENSI AKTIF
        </p>
        <p className="text-muted-foreground">Pindai QR ini dari halaman Pindai QR di ponsel mahasiswa.</p>
      </div>
      <div className="rounded-3xl border-8 border-secondary bg-white p-4">
        <QRCodeSVG value={qrPayload} size={340} level="M" marginSize={1} title={`QR presensi ${session.course} pertemuan ${session.meetingNo}`} />
      </div>
      <div className="flex w-full max-w-md flex-col gap-2">
        <p className="text-6xl font-extrabold tabular-nums" aria-live="off">
          {label}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Sisa waktu QR" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-emerald-500 transition-[width] duration-1000 ease-linear" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-sm text-muted-foreground">QR hanya dibuat sekali per sesi dan tidak bisa diperbarui.</p>
      </div>
      {devTools && (
        <div className="flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-dashed border-info p-4 text-left">
          <p className="text-xs font-bold text-info">Alat uji · isi QR (tempel di halaman Pindai QR mahasiswa)</p>
          <code className="text-xs break-all">{qrPayload}</code>
          <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => void navigator.clipboard?.writeText(qrPayload)}>
            Salin isi QR
          </Button>
        </div>
      )}
    </Card>
  );
}

const liveColumns: DataTableColumn<LiveRow>[] = [
  { key: 'nim', header: 'NIM', className: 'tabular-nums', cell: (r) => r.nim },
  { key: 'name', header: 'Nama', className: 'font-semibold', cell: (r) => r.name },
  { key: 'time', header: 'Waktu', className: 'tabular-nums', cell: (r) => r.time ?? '—' },
  { key: 'method', header: 'Metode', cell: (r) => r.method ?? '—' },
  { key: 'distance', header: 'Jarak', align: 'right', className: 'tabular-nums', cell: (r) => (r.distance !== null ? `${formatNumber(r.distance, 1)} m` : '—') },
  { key: 'status', header: 'Status', cell: (r) => <AttendanceBadge status={r.status} /> },
];

function LiveTable({ live, isLive }: { live: Live; isLive: boolean }) {
  const { counts } = live;
  const tiles = [
    { label: 'Hadir', value: counts.present },
    { label: 'Terlambat', value: counts.late },
    { label: 'Izin', value: counts.excused },
    { label: 'Tidak Hadir', value: counts.absent },
    { label: 'Belum', value: counts.notYet },
  ];

  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">
          Daftar presensi{' '}
          <span className="text-muted-foreground">
            ({counts.total - counts.notYet}/{counts.total})
          </span>
        </h2>
        {isLive && (
          <span className="flex items-center gap-2 text-xs font-semibold text-success">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
            Diperbarui otomatis tiap 3 detik
          </span>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-muted/60 p-3 text-center">
            <p className="text-2xl font-extrabold tabular-nums">{t.value}</p>
            <p className="text-xs text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>
      <DataTable columns={liveColumns} rows={live.rows} getRowKey={(r) => r.studentId} isLive={isLive} />
    </Card>
  );
}
