import { Link } from '@inertiajs/react';

import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/utils';

interface ScheduleItem {
  id: number;
  day: string;
  dayOfWeek: number;
  time: string;
  course: string;
  courseCode: string;
  credits: number;
  classGroup: string;
  room: string;
  meetingsDone: number;
  totalMeetings: number;
  nextSession: { id: number; date: string; meetingNo: number } | null;
}

interface Props {
  period: string | null;
  schedules: ScheduleItem[];
}

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function LecturerSchedule({ period, schedules }: Props) {
  return (
    <AppLayout title="Jadwal Mengajar">
      <PageHeader title="Jadwal Mengajar" description={period ? `Periode ${period} · ${schedules.length} kelas` : 'Belum ada periode aktif.'} />

      {schedules.length === 0 && <Card className="text-sm text-muted-foreground">Belum ada jadwal mengajar di periode ini.</Card>}

      {DAYS.map((day, i) => {
        const items = schedules.filter((s) => s.dayOfWeek === i + 1);
        if (items.length === 0) return null;
        return (
          <section key={day} aria-labelledby={`day-${i}`} className="flex flex-col gap-3">
            <h2 id={`day-${i}`} className="text-lg font-extrabold">
              {day}
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((s) => (
                <Card key={s.id} className="gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{s.course}</p>
                      <p className="text-sm text-muted-foreground">
                        {s.courseCode} · {s.credits} SKS · {s.classGroup}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold whitespace-nowrap text-primary">{s.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.room} · {s.meetingsDone}/{s.totalMeetings} pertemuan terlaksana
                  </p>
                  {s.nextSession && (
                    <div className="flex items-center justify-between gap-3 border-t pt-3">
                      <span className="text-sm">
                        Berikutnya: pertemuan {s.nextSession.meetingNo}, {formatDate(s.nextSession.date)}
                      </span>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dosen/presensi/${s.nextSession.id}`}>Buka sesi</Link>
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </AppLayout>
  );
}
