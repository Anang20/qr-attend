import { router, useForm } from '@inertiajs/react';
import { FileText, Paperclip, Upload, X } from 'lucide-react';
import { type FormEvent, useMemo, useRef, useState } from 'react';

import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { PageHeader } from '@/components/app/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn, formatDate } from '@/lib/utils';
import type { Option } from '@/types';

type LockReason = 'outside_window' | 'attended' | 'requested' | null;

interface Meeting {
  id: number;
  date: string;
  day: string;
  time: string;
  course: string;
  lecturer: string;
  meetingNo: number;
  lock: LockReason;
}

interface MyRequest {
  id: number;
  course: string;
  meetingNo: number;
  date: string;
  type: string;
  typeLabel: string;
  reason: string;
  hasAttachment: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  statusLabel: string;
  reviewNote: string | null;
  reviewer: string | null;
  reviewedAt: string | null;
  submittedAt: string | null;
  lecturer: string;
}

interface Props {
  classGroup: string;
  period: string | null;
  policy: { before: number; after: number };
  types: Option[];
  meetings: Meeting[];
  requests: MyRequest[];
}

interface LeaveForm {
  type: string;
  session_ids: number[];
  reason: string;
  attachment: File | null;
}

const MAX_FILE = 2 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'application/pdf'];

const lockLabel: Record<Exclude<LockReason, null>, string> = {
  outside_window: 'Lewat batas',
  attended: 'Sudah hadir',
  requested: 'Sudah diajukan',
};

const statusVariant: Record<MyRequest['status'], BadgeVariant> = { pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'muted' };

const typeHint: Record<string, string> = { sick: 'Wajib surat keterangan dokter', permit: 'Keperluan mendesak, lampiran opsional' };

export default function LeaveRequests({ classGroup, period, policy, types, meetings, requests }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<MyRequest | null>(null);

  const { data, setData, post, processing, errors, reset } = useForm<LeaveForm>({ type: 'sick', session_ids: [], reason: '', attachment: null });
  const isSick = data.type === 'sick';

  // Kelompokkan pertemuan per tanggal agar mudah memilih beberapa hari sakit.
  const groups = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of meetings) map.set(m.date, [...(map.get(m.date) ?? []), m]);
    return [...map.entries()];
  }, [meetings]);

  const toggle = (id: number, checked: boolean) =>
    setData('session_ids', checked ? [...data.session_ids, id] : data.session_ids.filter((x) => x !== id));

  // Validasi berkas langsung saat dipilih, tidak menunggu tombol kirim.
  const onFile = (file: File | null) => {
    if (file && !ACCEPTED.includes(file.type)) {
      setFileError('Lampiran harus JPG, PNG, atau PDF.');
      setData('attachment', null);
      return;
    }
    if (file && file.size > MAX_FILE) {
      setFileError('Lampiran maksimal 2 MB.');
      setData('attachment', null);
      return;
    }
    setFileError(null);
    setData('attachment', file);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    post('/mahasiswa/pengajuan-izin', {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        reset();
        if (fileRef.current) fileRef.current.value = '';
      },
    });
  };

  const attachmentError = fileError ?? errors.attachment;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <AppLayout title="Pengajuan Izin">
      <PageHeader
        title="Pengajuan Izin"
        description={`${period ? `Periode ${period} · ` : ''}Kelas ${classGroup} · Izin dan sakit yang disetujui dicatat sebagai Izin.`}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Ajukan izin atau sakit</CardTitle>
            <CardDescription>
              Dikirim ke dosen pengampu tiap mata kuliah. Bisa diajukan mulai {policy.before} hari sebelum sampai {policy.after} hari setelah pertemuan.
            </CardDescription>
          </CardHeader>

          <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-semibold">
                Jenis pengajuan <span className="text-destructive">*</span>
              </legend>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
                {types.map((t) => {
                  const isSelected = data.type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setData('type', t.value)}
                      className={cn(
                        'flex flex-col gap-0.5 rounded-xl border p-4 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                        isSelected ? 'border-emerald-600 bg-secondary' : 'hover:bg-muted/50',
                      )}
                    >
                      <span className="font-bold">{t.label}</span>
                      <span className="text-xs text-muted-foreground">{typeHint[t.value]}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-2" aria-describedby="meetings-hint">
              <legend className="text-sm font-semibold">
                Pertemuan <span className="text-destructive">*</span>
              </legend>
              <p id="meetings-hint" className="text-xs text-muted-foreground">
                Bisa pilih lebih dari satu, misalnya sakit beberapa hari.
              </p>
              {errors.session_ids && <Alert variant="destructive">{errors.session_ids}</Alert>}
              <div className="flex max-h-[420px] flex-col gap-4 overflow-y-auto rounded-xl border p-4">
                {groups.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada pertemuan dalam rentang pengajuan.</p>}
                {groups.map(([date, items]) => (
                  <div key={date} className="flex flex-col gap-2">
                    <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      {items[0]?.day}, {formatDate(date)}
                    </p>
                    {items.map((m) => {
                      const id = `meeting-${m.id}`;
                      return (
                        <div key={m.id} className={cn('flex items-start gap-3', m.lock && 'opacity-60')}>
                          <Checkbox id={id} checked={data.session_ids.includes(m.id)} disabled={m.lock !== null} onCheckedChange={(v) => toggle(m.id, v === true)} className="mt-0.5" />
                          <Label htmlFor={id} className="flex flex-1 flex-col items-start gap-0.5 font-normal">
                            <span className="font-semibold">{m.course}</span>
                            <span className="text-xs text-muted-foreground">
                              Pertemuan {m.meetingNo} · {m.time} · {m.lecturer}
                            </span>
                          </Label>
                          {m.lock && <Badge variant={m.lock === 'outside_window' ? 'warning' : 'muted'}>{lockLabel[m.lock]}</Badge>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <Label htmlFor="reason">
                Alasan <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                value={data.reason}
                maxLength={300}
                rows={4}
                onChange={(e) => setData('reason', e.target.value)}
                placeholder="contoh: Demam tinggi sejak semalam, sudah periksa ke klinik kampus."
                aria-invalid={errors.reason ? true : undefined}
                aria-describedby="reason-help"
              />
              <div id="reason-help" className="flex justify-between text-xs">
                <span className={errors.reason ? 'font-medium text-destructive' : 'text-muted-foreground'}>{errors.reason ?? 'Minimal 15 karakter.'}</span>
                <span className="text-muted-foreground tabular-nums">{data.reason.length}/300</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="attachment">
                {isSick ? 'Surat keterangan sakit' : 'Lampiran (opsional)'}
                {isSick && <span className="text-destructive">*</span>}
              </Label>
              <input
                ref={fileRef}
                id="attachment"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                aria-describedby="attachment-help"
              />
              {data.attachment ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border bg-secondary px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Paperclip className="size-4" aria-hidden />
                    {data.attachment.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onFile(null);
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                  >
                    <X aria-hidden />
                    Hapus
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-left hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
                    <Upload className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold text-primary">Pilih file</span>
                    <span className="block text-xs text-muted-foreground">JPG, PNG, atau PDF · maks. 2 MB</span>
                  </span>
                </button>
              )}
              <p id="attachment-help" className={attachmentError ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'}>
                {attachmentError ?? (isSick ? 'Surat keterangan dokter atau klinik.' : 'Mis. surat undangan atau surat tugas.')}
              </p>
            </div>

            <Button type="submit" size="lg" disabled={processing || data.session_ids.length === 0}>
              {processing ? 'Mengirim…' : data.session_ids.length > 0 ? `Kirim ${data.session_ids.length} pengajuan` : 'Kirim pengajuan'}
            </Button>
          </form>
        </Card>

        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Pengajuan saya</CardTitle>
            {pendingCount > 0 && <span className="text-sm text-muted-foreground">{pendingCount} menunggu persetujuan</span>}
          </CardHeader>
          {requests.length === 0 && <p className="text-sm text-muted-foreground">Belum ada pengajuan.</p>}
          <ul className="flex flex-col gap-3">
            {requests.map((r) => (
              <li key={r.id} className={cn('flex flex-col gap-2 rounded-2xl border p-4', r.status === 'pending' && 'border-amber-200 bg-warning-soft/50')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{r.course}</p>
                    <p className="text-xs text-muted-foreground">
                      Pertemuan {r.meetingNo} · {formatDate(r.date)}
                    </p>
                  </div>
                  <Badge variant={statusVariant[r.status]}>{r.statusLabel}</Badge>
                </div>
                <p className="text-sm">
                  <Badge variant={r.type === 'sick' ? 'info' : 'outline'} className="mr-2">
                    {r.typeLabel}
                  </Badge>
                  {r.reason}
                </p>
                {r.hasAttachment && (
                  <a href={`/lampiran-izin/${r.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                    <FileText className="size-4" aria-hidden />
                    Lihat lampiran
                  </a>
                )}
                {r.status === 'approved' && <p className="rounded-xl bg-secondary px-3 py-2 text-sm text-success">Disetujui {r.reviewer ? `oleh ${r.reviewer}` : ''}. Tercatat Izin pada pertemuan ini.</p>}
                {r.status === 'rejected' && r.reviewNote && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-destructive">{r.reviewNote}</p>}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Diajukan {r.submittedAt ? formatDate(r.submittedAt) : '—'} · ke {r.lecturer}
                  </span>
                  {r.status === 'pending' && (
                    <Button variant="outline" size="sm" onClick={() => setCancelling(r)}>
                      Batalkan
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Batalkan pengajuan?"
        description={cancelling ? `${cancelling.course} pertemuan ${cancelling.meetingNo} tidak lagi diajukan ke dosen.` : ''}
        confirmLabel="Batalkan pengajuan"
        onConfirm={() => cancelling && router.delete(`/mahasiswa/pengajuan-izin/${cancelling.id}`, { preserveScroll: true, onFinish: () => setCancelling(null) })}
      />
    </AppLayout>
  );
}
