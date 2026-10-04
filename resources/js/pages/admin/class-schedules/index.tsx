import { Link, router } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Copy, Lock, Plus, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { fieldA11y, FormField } from '@/components/app/form-field';
import { FormSheet } from '@/components/app/form-sheet';
import { PageHeader } from '@/components/app/page-header';
import { RowActions } from '@/components/app/row-actions';
import { SelectField } from '@/components/app/select-field';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useResourceForm } from '@/hooks/use-resource-form';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { Option, Paginated } from '@/types';

interface PeriodOption extends Option {
  status: string;
}

interface ClassItem {
  id: number;
  code: string;
  cohortYear: number;
  schedulesCount: number;
  issuesCount: number;
}

interface ScheduleRow {
  id: number;
  course_id: string;
  course: string;
  courseCode: string;
  credits: number;
  lecturer_id: string;
  lecturer: string;
  room_id: string;
  room: string;
  roomHasPoint: boolean;
  day_of_week: string;
  day: string;
  start_time: string;
  end_time: string;
  openedSessions: number;
}

interface Slot {
  id: number;
  class_group_id: string;
  lecturer_id: string;
  room_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  label: string;
}

interface CourseOption extends Option {
  credits: number;
}

interface RoomOption extends Option {
  capacity: number;
  hasPoint: boolean;
}

interface Props {
  periods: PeriodOption[];
  period: { id: number; label: string; status: string; statusLabel: string; isReadOnly: boolean } | null;
  classes: ClassItem[];
  selectedClass: { id: number; code: string; studentsCount: number } | null;
  schedules: ScheduleRow[];
  schedulesPage: Paginated<ScheduleRow>;
  slots: Slot[];
  copySource: { periodId: number; label: string; count: number } | null;
  options: { courses: CourseOption[]; lecturers: Option[]; rooms: RoomOption[]; days: Option[] };
}

interface ScheduleForm {
  academic_period_id: string;
  class_group_id: string;
  course_id: string;
  lecturer_id: string;
  room_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

const URL = '/admin/pemetaan-kelas';
const MINUTES_PER_CREDIT = 50;

function addMinutes(time: string, minutes: number): string {
  const [h = 0, m = 0] = time.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const overlaps = (a: Pick<Slot, 'start_time' | 'end_time'>, b: Pick<Slot, 'start_time' | 'end_time'>) => a.start_time < b.end_time && b.start_time < a.end_time;

export default function ClassSchedulesIndex({ periods, period, classes, selectedClass, schedules, schedulesPage, slots, copySource, options }: Props) {
  const [classSearch, setClassSearch] = useState('');
  const isReadOnly = period?.isReadOnly ?? true;

  const emptyForm: ScheduleForm = {
    academic_period_id: String(period?.id ?? ''),
    class_group_id: String(selectedClass?.id ?? ''),
    course_id: '',
    lecturer_id: '',
    room_id: '',
    day_of_week: '1',
    start_time: '08:00',
    end_time: '10:30',
  };

  const crud = useResourceForm<ScheduleRow, ScheduleForm>(URL, emptyForm, (s) => ({
    academic_period_id: String(period?.id ?? ''),
    class_group_id: String(selectedClass?.id ?? ''),
    course_id: s.course_id,
    lecturer_id: s.lecturer_id,
    room_id: s.room_id,
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
  }));
  const { data, setData, errors, processing } = crud.form;

  const visit = (params: Record<string, string | number | undefined>) =>
    router.get(URL, { period_id: period?.id, class_group_id: selectedClass?.id, ...params }, { preserveScroll: true, preserveState: false });

  const mappedCourseIds = new Set(schedules.map((s) => s.course_id));
  const courseOptions = options.courses.map((c) => ({
    ...c,
    label: mappedCourseIds.has(c.value) && c.value !== crud.editing?.course_id ? `${c.label} (sudah dipetakan)` : c.label,
  }));

  // Pemeriksaan otomatis di form (server tetap memeriksa ulang).
  const checks = useMemo(() => {
    const others = slots.filter((s) => s.id !== crud.editing?.id && s.day_of_week === data.day_of_week && overlaps(s, data));
    const find = (key: 'class_group_id' | 'lecturer_id' | 'room_id', value: string) => others.find((s) => s[key] === value)?.label;
    const room = options.rooms.find((r) => r.value === data.room_id);
    const students = selectedClass?.studentsCount ?? 0;

    return [
      { label: 'Kelas bebas di jam ini', conflict: find('class_group_id', data.class_group_id) },
      { label: 'Dosen bebas di jam ini', conflict: data.lecturer_id ? find('lecturer_id', data.lecturer_id) : undefined, isPending: !data.lecturer_id },
      { label: 'Ruang bebas di jam ini', conflict: data.room_id ? find('room_id', data.room_id) : undefined, isPending: !data.room_id },
      { label: 'Ruang punya titik presensi', conflict: room && !room.hasPoint ? 'belum diatur (sesi QR belum bisa dibuka)' : undefined, isPending: !room, isWarning: true },
      { label: `Kapasitas ruang cukup (${students} mahasiswa)`, conflict: room && room.capacity < students ? `kapasitas ${room.capacity}` : undefined, isPending: !room, isWarning: true },
    ];
  }, [slots, data, options.rooms, selectedClass, crud.editing]);

  const onCourseChange = (value: string) => {
    const course = options.courses.find((c) => c.value === value);
    setData((d) => ({ ...d, course_id: value, end_time: course ? addMinutes(d.start_time, course.credits * MINUTES_PER_CREDIT) : d.end_time }));
  };

  const filteredClasses = classes.filter((c) => c.code.toLowerCase().includes(classSearch.toLowerCase()));


  const columns: DataTableColumn<ScheduleRow>[] = [
    {
      key: 'course',
      header: 'Mata kuliah',
      cell: (s) => (
        <>
          <p className="font-bold">{s.course}</p>
          <p className="text-xs text-muted-foreground">
            {s.courseCode} · {s.credits} SKS
          </p>
        </>
      ),
    },
    { key: 'lecturer', header: 'Dosen', cell: (s) => s.lecturer },
    {
      key: 'schedule',
      header: 'Jadwal',
      className: 'whitespace-nowrap',
      cell: (s) => `${s.day}, ${s.start_time.replace(':', '.')}–${s.end_time.replace(':', '.')}`,
    },
    { key: 'room', header: 'Ruang', cell: (s) => s.room },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => (
        <>
          {s.roomHasPoint ? <Badge variant="success">Siap presensi</Badge> : <Badge variant="warning">Titik presensi belum ada</Badge>}
          {s.openedSessions > 0 && <p className="mt-1 text-xs text-muted-foreground">{s.openedSessions} sesi berjalan</p>}
        </>
      ),
    },
    // Periode Selesai: tanpa kolom aksi (read-only, BR-21).
    ...(isReadOnly
      ? []
      : [
          {
            key: 'actions',
            header: 'Aksi',
            isHeaderHidden: true,
            headClassName: 'w-24',
            cell: (s) => <RowActions name={s.course} onEdit={() => crud.openEdit(s)} onDelete={() => crud.setDeleting(s)} />,
          } satisfies DataTableColumn<ScheduleRow>,
        ]),
  ];

  return (
    <AppLayout title="Pemetaan Kelas">
      <PageHeader
        title="Pemetaan Kelas"
        description={
          <>
            Sumber tunggal jadwal: setiap pemetaan otomatis membuat 16 pertemuan dan tampil di{' '}
            <Link href="/admin/jadwal-akademik" className="font-semibold text-primary hover:underline">
              Jadwal Akademik
            </Link>
            .
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <SelectField aria-label="Periode" className="w-56" value={period ? String(period.id) : undefined} options={periods} onValueChange={(v) => visit({ period_id: v })} />
            {period && <Badge variant={period.status === 'active' ? 'success' : period.status === 'upcoming' ? 'info' : 'muted'}>{period.statusLabel}</Badge>}
          </div>
        }
      />

      {isReadOnly && period && (
        <Alert variant="info">
          <Lock aria-hidden />
          <span>Periode {period.label} sudah Selesai. Pemetaannya hanya bisa dilihat.</span>
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="gap-3 p-4">
          <Input type="search" placeholder="Cari kelas" aria-label="Cari kelas" value={classSearch} onChange={(e) => setClassSearch(e.target.value)} />
          <nav aria-label="Daftar kelas" className="flex max-h-[560px] flex-col gap-1 overflow-y-auto">
            {filteredClasses.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => visit({ class_group_id: c.id })}
                aria-current={c.id === selectedClass?.id ? 'true' : undefined}
                className={cn(
                  'flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                  c.id === selectedClass?.id && 'bg-secondary font-bold text-primary',
                )}
              >
                <span>
                  {c.code}
                  <span className="block text-xs font-normal text-muted-foreground">Angkatan {c.cohortYear}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {c.issuesCount > 0 && <span className="size-2 rounded-full bg-amber-500" title="Ada ruang tanpa titik presensi" />}
                  <span className="text-xs text-muted-foreground">{c.schedulesCount} MK</span>
                </span>
              </button>
            ))}
          </nav>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {selectedClass && (
            <Card className="gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold">Kelas {selectedClass.code}</h2>
                  <p className="text-sm text-muted-foreground">
                    {schedules.length} mata kuliah · {schedules.reduce((sum, s) => sum + s.credits, 0)} SKS · {selectedClass.studentsCount} mahasiswa
                  </p>
                </div>
                {!isReadOnly && (
                  <Button onClick={crud.openCreate}>
                    <Plus aria-hidden />
                    Petakan mata kuliah
                  </Button>
                )}
              </div>

              {copySource && (
                <Alert variant="info" className="items-center justify-between">
                  <span>Kelas ini belum punya pemetaan di periode ini.</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      router.post(`${URL}/salin`, { period_id: period?.id, source_period_id: copySource.periodId, class_group_id: selectedClass.id }, { preserveScroll: true })
                    }
                  >
                    <Copy aria-hidden />
                    Salin {copySource.count} pemetaan dari {copySource.label}
                  </Button>
                </Alert>
              )}

              <DataTable columns={columns} rows={schedulesPage} getRowKey={(s) => s.id} emptyMessage="Belum ada mata kuliah yang dipetakan." />

              <WeekGrid schedules={schedules} />
            </Card>
          )}
        </div>
      </div>

      <FormSheet
        isOpen={crud.isOpen}
        onOpenChange={crud.setIsOpen}
        title={crud.isEditing ? 'Ubah pemetaan' : `Petakan mata kuliah · ${selectedClass?.code ?? ''}`}
        onSubmit={crud.submit}
        isProcessing={processing}
        errorCount={Object.keys(errors).length}
      >
        {errors.academic_period_id && <Alert variant="destructive">{errors.academic_period_id}</Alert>}
        <FormField id="course_id" label="Mata kuliah" error={errors.course_id} isRequired>
          <SelectField {...fieldA11y('course_id', errors.course_id)} isInvalid={!!errors.course_id} value={data.course_id} options={courseOptions} onValueChange={onCourseChange} />
        </FormField>
        <FormField id="lecturer_id" label="Dosen pengampu" error={errors.lecturer_id} isRequired>
          <SelectField {...fieldA11y('lecturer_id', errors.lecturer_id)} isInvalid={!!errors.lecturer_id} value={data.lecturer_id} options={options.lecturers} onValueChange={(v) => setData('lecturer_id', v)} />
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField id="day_of_week" label="Hari" error={errors.day_of_week} isRequired>
            <SelectField {...fieldA11y('day_of_week', errors.day_of_week)} isInvalid={!!errors.day_of_week} value={data.day_of_week} options={options.days} onValueChange={(v) => setData('day_of_week', v)} />
          </FormField>
          <FormField id="start_time" label="Mulai" error={errors.start_time} isRequired>
            <Input {...fieldA11y('start_time', errors.start_time)} type="time" step={300} value={data.start_time} onChange={(e) => setData('start_time', e.target.value)} />
          </FormField>
          <FormField id="end_time" label="Selesai" error={errors.end_time} isRequired>
            <Input {...fieldA11y('end_time', errors.end_time)} type="time" step={300} value={data.end_time} onChange={(e) => setData('end_time', e.target.value)} />
          </FormField>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">Jam selesai terisi otomatis dari SKS (1 SKS = 50 menit) dan bisa diubah.</p>
        <FormField id="room_id" label="Ruang" error={errors.room_id} isRequired>
          <SelectField
            {...fieldA11y('room_id', errors.room_id)}
            isInvalid={!!errors.room_id}
            value={data.room_id}
            options={options.rooms.map((r) => ({ value: r.value, label: `${r.label} · ${r.capacity} kursi${r.hasPoint ? '' : ' · belum ada titik'}` }))}
            onValueChange={(v) => setData('room_id', v)}
          />
        </FormField>
        <Link href="/admin/ruang" className="-mt-2 text-xs font-semibold text-primary hover:underline">
          Kelola ruang & titik presensi
        </Link>

        <section aria-labelledby="checks-title" className="flex flex-col gap-2 rounded-2xl border bg-muted/40 p-4">
          <h3 id="checks-title" className="text-sm font-extrabold">
            Pemeriksaan otomatis
          </h3>
          <ul className="flex flex-col gap-1.5">
            {checks.map((c) => {
              const Icon = c.isPending ? null : c.conflict ? (c.isWarning ? AlertTriangle : XCircle) : CheckCircle2;
              return (
                <li key={c.label} className="flex items-start gap-2 text-sm">
                  {Icon ? (
                    <Icon className={cn('mt-0.5 size-4 shrink-0', c.conflict ? (c.isWarning ? 'text-warning' : 'text-destructive') : 'text-success')} aria-hidden />
                  ) : (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden />
                  )}
                  <span>
                    {c.label}
                    {c.conflict && <span className={c.isWarning ? 'text-warning' : 'text-destructive'}> — {c.conflict}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">Bentrok hanya diperiksa di periode yang sama.</p>
        </section>
      </FormSheet>

      <ConfirmDialog
        isOpen={crud.deleting !== null}
        onOpenChange={(open) => !open && crud.setDeleting(null)}
        title={`Lepas ${crud.deleting?.course ?? ''}?`}
        description="16 pertemuan yang belum berjalan ikut terhapus. Pemetaan yang sesinya sudah berjalan tidak bisa dilepas."
        confirmLabel="Lepas"
        onConfirm={crud.confirmDelete}
      />
    </AppLayout>
  );
}

/** Grid mingguan sederhana Senin–Jumat, 07.00–18.00. */
function WeekGrid({ schedules }: { schedules: ScheduleRow[] }) {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const startHour = 7;
  const endHour = 18;
  const hourHeight = 36;
  const toOffset = (time: string) => {
    const [h = 0, m = 0] = time.split(':').map(Number);
    return ((h - startHour) * 60 + m) * (hourHeight / 60);
  };

  return (
    <div className="overflow-x-auto pb-2" aria-label="Jadwal mingguan">
      <div className="grid min-w-[640px] grid-cols-[48px_repeat(5,minmax(0,1fr))] gap-1">
        <div />
        {days.map((d) => (
          <div key={d} className="pb-1 text-center text-xs font-bold text-muted-foreground">
            {d}
          </div>
        ))}
        <div className="relative" style={{ height: (endHour - startHour) * hourHeight }}>
          {Array.from({ length: endHour - startHour + 1 }, (_, i) => (
            <span key={i} className="absolute right-1 -translate-y-1/2 text-[10px] text-muted-foreground" style={{ top: i * hourHeight }}>
              {String(startHour + i).padStart(2, '0')}.00
            </span>
          ))}
        </div>
        {days.map((d, i) => (
          <div key={d} className="relative rounded-lg bg-muted/50" style={{ height: (endHour - startHour) * hourHeight }}>
            {schedules
              .filter((s) => Number(s.day_of_week) === i + 1)
              .map((s) => (
                <div
                  key={s.id}
                  className={cn('absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-1 text-[11px] leading-tight', s.roomHasPoint ? 'bg-primary text-white' : 'bg-warning-soft text-warning')}
                  style={{ top: toOffset(s.start_time), height: Math.max(toOffset(s.end_time) - toOffset(s.start_time), 20) }}
                  title={`${s.course} · ${s.room}`}
                >
                  <p className="truncate font-bold">{s.course}</p>
                  <p className="truncate opacity-80">{s.room}</p>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
