import { Link, router } from '@inertiajs/react';
import { ArrowLeft, Search } from 'lucide-react';
import { useState } from 'react';

import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { fieldA11y, FormField } from '@/components/app/form-field';
import { AttendanceBadge } from '@/components/app/session-status-badge';
import { SelectField } from '@/components/app/select-field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFilters } from '@/hooks/use-filters';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/utils';
import type { Option, Paginated, SessionSummary } from '@/types';

interface StudentRow {
  studentId: number;
  nim: string;
  name: string;
  status: string | null;
  method: string | null;
  time: string | null;
}

interface Props {
  session: SessionSummary;
  canEdit: boolean;
  students: Paginated<StudentRow>;
  search: string;
  statuses: Option[];
}

interface PendingChange {
  student: StudentRow;
  status: string;
}

export default function ManualAttendance({ session, canEdit, students, search, statuses }: Props) {
  const { filters, setFilter } = useFilters(`/dosen/presensi/${session.id}/manual`, { q: search });
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const statusLabel = (value: string) => statuses.find((s) => s.value === value)?.label ?? value;

  // BR-11: setiap perubahan manual dikonfirmasi lebih dulu.
  const confirm = () => {
    if (!pending) return;
    setIsSaving(true);
    router.put(
      `/dosen/presensi/${session.id}/manual/${pending.student.studentId}`,
      { status: pending.status, reason: reason || null },
      {
        preserveScroll: true,
        onFinish: () => {
          setIsSaving(false);
          setPending(null);
          setReason('');
        },
      },
    );
  };


  const columns: DataTableColumn<StudentRow>[] = [
    { key: 'nim', header: 'NIM', className: 'tabular-nums', cell: (s) => s.nim },
    { key: 'name', header: 'Nama', className: 'font-semibold', cell: (s) => s.name },
    {
      key: 'current',
      header: 'Saat ini',
      cell: (s) => (
        <>
          <AttendanceBadge status={s.status} />
          {s.time && <span className="ml-2 text-xs text-muted-foreground">{s.time}</span>}
        </>
      ),
    },
    { key: 'method', header: 'Metode', cell: (s) => s.method ?? '—' },
    {
      key: 'change',
      header: 'Ubah status',
      headClassName: 'w-52',
      cell: (s) => (
        <SelectField
          aria-label={`Ubah status ${s.name}`}
          value={s.status ?? undefined}
          options={statuses}
          placeholder="Pilih status"
          isDisabled={!canEdit}
          onValueChange={(v) => v !== s.status && setPending({ student: s, status: v })}
        />
      ),
    },
  ];

  return (
    <AppLayout title="Presensi Manual">
      <div className="flex flex-col gap-2">
        <Link href={`/dosen/presensi/${session.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden />
          Kembali ke sesi
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">Presensi Manual</h1>
        <p className="text-muted-foreground">
          {session.course} · {session.classGroup} · Pertemuan {session.meetingNo} · {formatDate(session.date)}
        </p>
      </div>

      {!canEdit && <Alert variant="warning">Presensi manual hanya bisa setelah sesi dibuka dan bila diizinkan kebijakan kampus.</Alert>}

      <Card className="gap-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={filters.q ?? ''} onChange={(e) => setFilter('q', e.target.value)} placeholder="Cari nama atau NIM" aria-label="Cari nama atau NIM" className="pl-9" />
        </div>

        <DataTable columns={columns} rows={students} getRowKey={(s) => s.studentId} emptyMessage="Mahasiswa tidak ditemukan." />
      </Card>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah status {pending?.student.name}?</DialogTitle>
            <DialogDescription>
              {pending && `${pending.student.status ? statusLabel(pending.student.status) : 'Belum ada'} → ${statusLabel(pending.status)}. Perubahan tercatat dengan metode Manual.`}
            </DialogDescription>
          </DialogHeader>
          <FormField id="reason" label="Alasan (opsional)">
            <Textarea {...fieldA11y('reason')} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Mis. kamera ponsel rusak, sudah dicek di kelas" />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Batal
            </Button>
            <Button onClick={confirm} disabled={isSaving}>
              {isSaving ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
