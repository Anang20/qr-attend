import { Link, usePage } from '@inertiajs/react';
import { ScanLine } from 'lucide-react';

import { PageHeader } from '@/components/app/page-header';
import { type CourseRecap, CourseRecapList } from '@/components/app/course-recap-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import type { SharedProps } from '@/types';

interface StudentDashboardProps {
  profile: { nim: string; studyProgram: string; classGroup: string; cohortYear: number; advisor: string | null };
  period: string | null;
  today: { total: number; open: number };
  recap: CourseRecap[];
}

export default function StudentDashboard({ profile, period, today, recap }: StudentDashboardProps) {
  const { auth } = usePage<SharedProps>().props;
  const firstName = auth.user?.name.split(' ')[0] ?? '';

  const rows = [
    { label: 'NIM', value: profile.nim },
    { label: 'Program studi', value: profile.studyProgram },
    { label: 'Kelas', value: profile.classGroup },
    { label: 'Angkatan', value: String(profile.cohortYear) },
    { label: 'Dosen wali', value: profile.advisor ?? '—' },
    { label: 'Periode', value: period ?? '—' },
  ];

  return (
    <AppLayout title="Beranda">
      <PageHeader title={`Halo, ${firstName}`} description={`${profile.nim} · ${profile.classGroup}`} />
      <Card>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-1 rounded-xl bg-muted/60 p-4">
              <dt className="text-xs text-muted-foreground">{r.label}</dt>
              <dd className="font-bold">{r.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card className={today.open > 0 ? 'flex-row flex-wrap items-center justify-between gap-4 border-transparent bg-brand-deep text-white' : 'flex-row flex-wrap items-center justify-between gap-4'}>
        <div className="flex items-center gap-4">
          <ScanLine className={today.open > 0 ? 'size-8 text-emerald-200' : 'size-8 text-primary'} aria-hidden />
          <div>
            <p className="font-bold">{today.open > 0 ? 'Presensi sedang dibuka' : `${today.total} kuliah hari ini`}</p>
            <p className={today.open > 0 ? 'text-sm text-emerald-100/80' : 'text-sm text-muted-foreground'}>
              {today.open > 0 ? 'Pindai QR yang ditayangkan dosen sebelum waktunya habis.' : 'Lihat jadwal dan status presensi hari ini.'}
            </p>
          </div>
        </div>
        <Button asChild variant={today.open > 0 ? 'secondary' : 'outline'}>
          <Link href={today.open > 0 ? '/mahasiswa/pindai' : '/mahasiswa/kelas-hari-ini'}>{today.open > 0 ? 'Pindai QR' : 'Kelas Hari Ini'}</Link>
        </Button>
      </Card>
      {recap.length > 0 && (
        <Card className="gap-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">Rekap kehadiran</h2>
              <p className="text-sm text-muted-foreground">Minimal 75% untuk ikut UAS</p>
            </div>
            <Link href="/mahasiswa/riwayat" className="text-sm font-bold text-primary hover:underline">
              Lihat riwayat
            </Link>
          </div>
          <CourseRecapList items={recap} />
        </Card>
      )}
    </AppLayout>
  );
}
