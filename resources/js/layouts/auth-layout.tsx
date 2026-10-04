import { Head } from '@inertiajs/react';
import { QrCode } from 'lucide-react';
import type { ReactNode } from 'react';

import { Toaster } from '@/components/ui/sonner';
import { useFlashToast } from '@/hooks/use-flash-toast';

interface AuthLayoutProps {
  title: string;
  children: ReactNode;
  /** Konten panel kiri; bawaan berisi slogan dan angka kebijakan. */
  aside?: ReactNode;
}

const stats = [
  { value: '20 menit', label: 'Masa berlaku QR' },
  { value: '5 m', label: 'Radius titik presensi' },
  { value: '1×', label: 'Presensi per sesi' },
];

export default function AuthLayout({ title, children, aside }: AuthLayoutProps) {
  useFlashToast();

  return (
    <>
      <Head title={title} />
      <div className="flex min-h-screen gap-4 p-4">
        <section className="relative hidden w-[46%] flex-col justify-between overflow-hidden rounded-3xl bg-brand-deep p-10 text-white lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/10">
              <QrCode className="size-6" aria-hidden />
            </span>
            <span className="text-xl font-extrabold">QR Attend</span>
          </div>

          {aside ?? (
            <div className="flex flex-col gap-6">
              <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-widest">UNIVERSITAS PAMULANG</span>
              <h1 className="text-5xl leading-tight font-extrabold tracking-tight">
                Sekali pindai.
                <br />
                Presensi terverifikasi.
              </h1>
              <p className="max-w-md text-base text-emerald-100/80">
                Dosen membuka sesi, mahasiswa memindai QR di kelas. Lokasi dan jadwal diperiksa otomatis.
              </p>
            </div>
          )}

          <dl className="grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 p-4">
                <dt className="text-xs text-emerald-100/80">{s.label}</dt>
                <dd className="mt-1 text-2xl font-extrabold">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <main className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[460px]">{children}</div>
        </main>
      </div>
      <Toaster />
    </>
  );
}
