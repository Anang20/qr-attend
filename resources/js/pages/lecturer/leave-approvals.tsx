import { router, useForm } from '@inertiajs/react';
import { FileText } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { FormField } from '@/components/app/form-field';
import { PageHeader } from '@/components/app/page-header';
import { SelectField } from '@/components/app/select-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ALL } from '@/hooks/use-filters';
import AppLayout from '@/layouts/app-layout';
import { cn, formatDate } from '@/lib/utils';
import type { Option } from '@/types';

type Status = 'pending' | 'approved' | 'rejected';

interface LeaveItem {
  id: number;
  student: string;
  initials: string;
  nim: string;
  classGroup: string;
  submittedAt: string | null;
  course: string;
  meetingNo: number;
  date: string;
  type: string;
  typeLabel: string;
  reason: string;
  attachmentUrl: string | null;
  currentStatus: string;
  absences: number;
  held: number;
  status: Status;
  reviewNote: string | null;
  reviewedAt: string | null;
}

interface Props {
  period: string | null;
  status: Status;
  courseId: string | null;
  counts: Record<Status, number>;
  courses: Option[];
  requests: LeaveItem[];
  quickReasons: string[];
}

const URL = '/dosen/persetujuan-izin';

const tabLabels: Record<Status, string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };

function timeLabel(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${formatDate(iso)}, ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function LeaveApprovals({ period, status, courseId, counts, courses, requests, quickReasons }: Props) {
  const [approving, setApproving] = useState<LeaveItem | null>(null);
  const [rejecting, setRejecting] = useState<LeaveItem | null>(null);
  const rejectForm = useForm({ note: '' });

  const visit = (params: { status?: string; course_id?: string | null }) =>
    router.get(URL, { status, course_id: courseId ?? undefined, ...params }, { preserveScroll: true, preserveState: false });

  const submitReject = (e: FormEvent) => {
    e.preventDefault();
    if (!rejecting) return;
    rejectForm.post(`${URL}/${rejecting.id}/tolak`, {
      preserveScroll: true,
      onSuccess: () => {
        setRejecting(null);
        rejectForm.reset();
      },
    });
  };

  return (
    <AppLayout title="Persetujuan Izin">
      <PageHeader title="Persetujuan Izin" description={`${period ? `Periode ${period} · ` : ''}pengajuan dari mahasiswa di mata kuliah yang Anda ampu`} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status} onValueChange={(v) => visit({ status: v })}>
          <TabsList className="w-auto">
            {(Object.keys(tabLabels) as Status[]).map((s) => (
              <TabsTrigger key={s} value={s} className="gap-2 px-4">
                {tabLabels[s]}
                <span className={cn('rounded-full px-2 text-xs', s === 'pending' && counts[s] > 0 ? 'bg-amber-500 text-white' : 'bg-muted-foreground/15')}>{counts[s]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SelectField aria-label="Mata kuliah" className="w-64" value={courseId ?? undefined} options={courses} allLabel="Semua mata kuliah" onValueChange={(v) => visit({ course_id: v === ALL ? null : v })} />
      </div>

      {requests.length === 0 && <Card className="items-center py-12 text-sm text-muted-foreground">Tidak ada pengajuan {tabLabels[status].toLowerCase()}.</Card>}

      <ul className="flex flex-col gap-3">
        {requests.map((r) => (
          <li key={r.id}>
            <Card className={cn('gap-0 p-5 lg:flex-row lg:items-start lg:gap-6', r.status === 'pending' && 'border-amber-200')}>
              <div className="flex min-w-56 items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary" aria-hidden>
                  {r.initials}
                </span>
                <div>
                  <p className="font-bold">{r.student}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.nim} · {r.classGroup}
                  </p>
                  <p className="text-xs text-muted-foreground">Diajukan {timeLabel(r.submittedAt)}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-1 flex-col gap-2 lg:mt-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{r.course}</span>
                  <span className="text-sm text-muted-foreground">
                    Pertemuan {r.meetingNo} · {formatDate(r.date)}
                  </span>
                  <Badge variant={r.type === 'sick' ? 'info' : 'outline'}>{r.typeLabel}</Badge>
                </p>
                <p className="text-sm">{r.reason}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {r.attachmentUrl ? (
                    <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-secondary px-3 py-1 font-semibold text-primary hover:underline">
                      <FileText className="size-3.5" aria-hidden />
                      Lihat lampiran
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Tanpa lampiran</span>
                  )}
                  <span>
                    Presensi saat ini: <strong>{r.currentStatus}</strong>
                  </span>
                  {r.held > 0 && r.absences > 0 && <Badge variant="warning">Tidak hadir {r.absences} dari {r.held} pertemuan</Badge>}
                </div>
                {r.status === 'rejected' && r.reviewNote && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-destructive">Ditolak: {r.reviewNote}</p>}
                {r.status === 'approved' && <p className="text-sm text-success">Disetujui {timeLabel(r.reviewedAt)} · tercatat Izin.</p>}
              </div>

              {r.status === 'pending' && (
                <div className="mt-4 flex shrink-0 gap-2 lg:mt-0">
                  <Button variant="outline" className="text-destructive hover:bg-danger-soft hover:text-destructive" onClick={() => setRejecting(r)}>
                    Tolak
                  </Button>
                  <Button onClick={() => setApproving(r)}>Setujui</Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        isOpen={approving !== null}
        onOpenChange={(open) => !open && setApproving(null)}
        title={`Setujui pengajuan ${approving?.student ?? ''}?`}
        description={approving ? `${approving.course} pertemuan ${approving.meetingNo} akan tercatat Izin.` : ''}
        confirmLabel="Setujui"
        isDestructive={false}
        onConfirm={() => approving && router.post(`${URL}/${approving.id}/setujui`, {}, { preserveScroll: true, onFinish: () => setApproving(null) })}
      />

      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <form onSubmit={submitReject} className="flex flex-col gap-4" noValidate>
            <DialogHeader>
              <DialogTitle>Tolak pengajuan {rejecting?.student}?</DialogTitle>
              <DialogDescription>Presensi tidak berubah. Alasan akan terlihat oleh mahasiswa.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {quickReasons.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => rejectForm.setData('note', q)}
                  className="rounded-full border px-3 py-1 text-xs font-semibold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
                >
                  {q}
                </button>
              ))}
            </div>
            <FormField id="note" label="Alasan penolakan" error={rejectForm.errors.note} hint="Minimal 10 karakter." isRequired>
              <Textarea
                id="note"
                value={rejectForm.data.note}
                maxLength={300}
                onChange={(e) => rejectForm.setData('note', e.target.value)}
                aria-invalid={rejectForm.errors.note ? true : undefined}
                aria-describedby={rejectForm.errors.note ? 'note-error' : 'note-hint'}
              />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejecting(null)}>
                Batal
              </Button>
              <Button type="submit" variant="destructive" disabled={rejectForm.processing}>
                Tolak pengajuan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
