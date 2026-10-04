import { Link } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Circle, Info, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn, formatNumber } from '@/lib/utils';
import type { SessionSummary } from '@/types';

type Result = 'unauthorized' | 'invalid_qr' | 'expired' | 'wrong_class' | 'wrong_schedule' | 'duplicate' | 'device_mismatch' | 'low_accuracy' | 'outside_radius';

interface Scan {
  result: Result;
  failedCheck: string | null;
  session: SessionSummary | null;
  distance: number | null;
  accuracy: number;
  radius: number | null;
  maxAccuracy: number;
  existingTime: string | null;
  existingId: number | null;
  qrClassGroup: string | null;
  expiredAt: string | null;
}

interface Props {
  scan: Scan;
  checks: { key: string; label: string }[];
}

type Tone = 'danger' | 'warning' | 'info';

interface Variant {
  title: string;
  message: string;
  hint?: string;
  tone: Tone;
  action: { label: string; href: string };
}

function variantFor(scan: Scan): Variant {
  const room = scan.session?.room ?? 'ruang kelas';
  const retry = { label: 'Coba lagi', href: '/mahasiswa/pindai' };
  const today = { label: 'Lihat kelas hari ini', href: '/mahasiswa/kelas-hari-ini' };

  switch (scan.result) {
    case 'outside_radius':
      return {
        title: 'Presensi Gagal',
        message: 'Lokasi Anda saat ini berada di luar area presensi yang diizinkan.',
        hint: `Anda sekitar ${formatNumber(scan.distance ?? 0, 0)} m dari ${room}. Mendekatlah ke titik presensi (maks. ${scan.radius ?? 5} m) lalu pindai ulang.`,
        tone: 'danger',
        action: retry,
      };
    case 'low_accuracy':
      return {
        title: 'Lokasi Kurang Akurat',
        message: `Akurasi lokasi perangkat Anda sekitar ±${formatNumber(scan.accuracy, 0)} m, sedangkan batasnya ${scan.maxAccuracy} m.`,
        hint: 'Nyalakan GPS atau mode akurasi tinggi, dekati jendela, tunggu beberapa detik, lalu pindai ulang.',
        tone: 'warning',
        action: retry,
      };
    case 'expired':
      return {
        title: 'Sesi Presensi Kedaluwarsa',
        message: scan.expiredAt ? `QR untuk sesi ini sudah tidak berlaku sejak pukul ${scan.expiredAt}.` : 'QR untuk sesi ini sudah tidak berlaku.',
        hint: 'Minta dosen mencatat presensi Anda secara manual bila Anda hadir.',
        tone: 'danger',
        action: today,
      };
    case 'wrong_class':
      return {
        title: 'Bukan Kelas Anda',
        message: `QR ini untuk kelas ${scan.qrClassGroup ?? 'lain'}.`,
        hint: 'Pastikan Anda memindai QR di kelas sesuai jadwal Anda.',
        tone: 'danger',
        action: today,
      };
    case 'wrong_schedule':
      return { title: 'Di Luar Jadwal Kuliah', message: 'Presensi hanya bisa dilakukan pada jam kuliah yang dijadwalkan.', tone: 'danger', action: today };
    case 'duplicate':
      return {
        title: 'Presensi Sudah Tercatat',
        message: scan.existingTime ? `Anda sudah presensi di sesi ini pukul ${scan.existingTime}.` : 'Anda sudah presensi di sesi ini.',
        tone: 'info',
        action: scan.existingId ? { label: 'Lihat detail presensi', href: `/mahasiswa/riwayat/${scan.existingId}` } : today,
      };
    case 'device_mismatch':
      return {
        title: 'Perangkat Tidak Dikenali',
        message: 'Presensi hanya bisa dari perangkat yang terikat ke akun Anda.',
        hint: 'Bila ini ponsel Anda, keluar lalu masuk lagi. Bila akun sudah terikat ke ponsel lain, minta admin mereset perangkat.',
        tone: 'warning',
        action: today,
      };
    case 'unauthorized':
      return { title: 'Perlu Masuk Ulang', message: 'Sesi login Anda berakhir.', tone: 'warning', action: { label: 'Masuk', href: '/masuk' } };
    default:
      return { title: 'QR Code Tidak Valid', message: 'QR yang dipindai bukan QR presensi yang sah.', hint: 'Pindai QR yang sedang ditayangkan dosen di kelas.', tone: 'danger', action: { label: 'Pindai lagi', href: '/mahasiswa/pindai' } };
  }
}

const toneStyle: Record<Tone, { icon: typeof XCircle; wrap: string }> = {
  danger: { icon: XCircle, wrap: 'bg-danger-soft text-destructive' },
  warning: { icon: AlertTriangle, wrap: 'bg-warning-soft text-warning' },
  info: { icon: Info, wrap: 'bg-info-soft text-info' },
};

export default function ScanFailed({ scan, checks }: Props) {
  const v = variantFor(scan);
  const { icon: Icon, wrap } = toneStyle[v.tone];
  const failedIndex = checks.findIndex((c) => c.key === scan.failedCheck);

  return (
    <AppLayout title={v.title}>
      <Card className="mx-auto w-full max-w-lg gap-5 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className={cn('flex size-16 items-center justify-center rounded-full', wrap)}>
            <Icon className="size-9" aria-hidden />
          </span>
          <h1 className="text-2xl font-extrabold">{v.title}</h1>
          <p className="text-muted-foreground">{v.message}</p>
          {v.hint && <p className="rounded-xl bg-muted px-4 py-3 text-sm">{v.hint}</p>}
        </div>

        {scan.session && (
          <p className="text-center text-sm text-muted-foreground">
            {scan.session.course} · {scan.session.classGroup} · {scan.session.room}
          </p>
        )}

        <section aria-labelledby="checks-title" className="rounded-2xl border p-4">
          <h2 id="checks-title" className="mb-2 text-sm font-extrabold">
            Hasil validasi
          </h2>
          <ol className="flex flex-col gap-2">
            {checks.map((c, i) => {
              const state = i < failedIndex ? 'pass' : i === failedIndex ? 'fail' : 'skip';
              return (
                <li key={c.key} className={cn('flex items-center justify-between gap-3 text-sm', state === 'fail' && 'font-bold text-destructive', state === 'skip' && 'text-muted-foreground')}>
                  <span className="flex items-center gap-2">
                    {state === 'pass' ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : state === 'fail' ? <XCircle className="size-4" aria-hidden /> : <Circle className="size-4" aria-hidden />}
                    {c.label}
                  </span>
                  <span className="text-xs">{state === 'pass' ? 'Lolos' : state === 'fail' ? 'Gagal' : 'Tidak dicek'}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <Button asChild>
          <Link href={v.action.href}>{v.action.label}</Link>
        </Button>
      </Card>
    </AppLayout>
  );
}
