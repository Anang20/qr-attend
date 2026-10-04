import { router } from '@inertiajs/react';
import { Check, Plus, X } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { DataToolbar } from '@/components/app/data-toolbar';
import { fieldA11y, FormField } from '@/components/app/form-field';
import { FormSheet } from '@/components/app/form-sheet';
import { PageHeader } from '@/components/app/page-header';
import { RowActions } from '@/components/app/row-actions';
import { SelectField } from '@/components/app/select-field';
import { Alert } from '@/components/ui/alert';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFilters } from '@/hooks/use-filters';
import { useResourceForm } from '@/hooks/use-resource-form';
import AppLayout from '@/layouts/app-layout';
import type { Filters, Option, Paginated } from '@/types';

interface LecturerRow {
  id: number;
  nidn: string;
  name: string;
  email: string;
  phone: string | null;
  study_program_id: string;
  studyProgram: string;
  functional_position: string | null;
  status: string;
  statusLabel: string;
  accountStatus: string;
  accountStatusLabel: string;
}

interface LecturerForm {
  nidn: string;
  name: string;
  email: string;
  phone: string;
  study_program_id: string;
  functional_position: string;
  status: string;
}

interface Props {
  lecturers: Paginated<LecturerRow>;
  filters: Filters;
  pendingCount: number;
  options: { studyPrograms: Option[]; statuses: Option[]; accountStatuses: Option[] };
}

type Decision = { lecturer: LecturerRow; action: 'approve' | 'reject' };

const URL = '/admin/dosen';

const accountVariant: Record<string, BadgeVariant> = { active: 'success', pending: 'warning', rejected: 'danger', inactive: 'muted' };

const emptyForm: LecturerForm = { nidn: '', name: '', email: '', phone: '', study_program_id: '', functional_position: '', status: 'active' };

export default function LecturersIndex({ lecturers, filters: initialFilters, pendingCount, options }: Props) {
  const { filters, setFilter, reset, isDirty } = useFilters(URL, initialFilters);
  const [decision, setDecision] = useState<Decision | null>(null);
  const crud = useResourceForm<LecturerRow, LecturerForm>(URL, emptyForm, (l) => ({
    nidn: l.nidn,
    name: l.name,
    email: l.email,
    phone: l.phone ?? '',
    study_program_id: l.study_program_id,
    functional_position: l.functional_position ?? '',
    status: l.status,
  }));
  const { data, setData, errors, processing } = crud.form;

  const decide = () => {
    if (!decision) return;
    const path = decision.action === 'approve' ? 'setujui' : 'tolak';
    router.post(`${URL}/${decision.lecturer.id}/${path}`, {}, { preserveScroll: true, onFinish: () => setDecision(null) });
  };


  const columns: DataTableColumn<LecturerRow>[] = [
    {
      key: 'name',
      header: 'Dosen',
      cell: (l) => (
        <>
          <p className="font-bold">{l.name}</p>
          <p className="text-xs text-muted-foreground">{l.email}</p>
        </>
      ),
    },
    { key: 'nidn', header: 'NIDN', className: 'tabular-nums', cell: (l) => l.nidn },
    { key: 'program', header: 'Prodi', cell: (l) => l.studyProgram },
    { key: 'position', header: 'Jabatan', cell: (l) => l.functional_position ?? '—' },
    { key: 'status', header: 'Status', cell: (l) => <Badge variant={l.status === 'active' ? 'success' : 'muted'}>{l.statusLabel}</Badge> },
    { key: 'account', header: 'Akun', cell: (l) => <Badge variant={accountVariant[l.accountStatus] ?? 'muted'}>{l.accountStatusLabel}</Badge> },
    {
      key: 'actions',
      header: 'Aksi',
      isHeaderHidden: true,
      headClassName: 'w-24',
      cell: (l) =>
        l.accountStatus === 'pending' ? (
          <div className="flex justify-end gap-1">
            <Button size="sm" onClick={() => setDecision({ lecturer: l, action: 'approve' })}>
              <Check aria-hidden />
              Setujui
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDecision({ lecturer: l, action: 'reject' })} aria-label={`Tolak ${l.name}`}>
              <X aria-hidden />
            </Button>
          </div>
        ) : (
          <RowActions name={l.name} onEdit={() => crud.openEdit(l)} onDelete={() => crud.setDeleting(l)} />
        ),
    },
  ];

  return (
    <AppLayout title="Dosen">
      <PageHeader
        title="Dosen"
        description="Akun yang dibuat admin langsung aktif dengan kata sandi awal = NIDN."
        actions={
          <Button onClick={crud.openCreate}>
            <Plus aria-hidden />
            Tambah dosen
          </Button>
        }
      />

      {pendingCount > 0 && filters.account !== 'pending' && (
        <Alert variant="warning" className="items-center justify-between">
          <span>
            <strong>{pendingCount} pendaftaran dosen</strong> menunggu persetujuan.
          </span>
          <Button size="sm" variant="outline" onClick={() => setFilter('account', 'pending')}>
            Tampilkan
          </Button>
        </Alert>
      )}

      <Card className="gap-4">
        <DataToolbar search={filters.q ?? ''} onSearchChange={(v) => setFilter('q', v)} searchPlaceholder="Cari nama atau NIDN" isDirty={isDirty} onReset={reset} total={lecturers.total}>
          <SelectField aria-label="Filter program studi" className="w-48" value={filters.study_program_id} options={options.studyPrograms} allLabel="Semua prodi" onValueChange={(v) => setFilter('study_program_id', v)} />
          <SelectField aria-label="Filter status akun" className="w-44" value={filters.account} options={options.accountStatuses} allLabel="Semua akun" onValueChange={(v) => setFilter('account', v)} />
        </DataToolbar>

        <DataTable columns={columns} rows={lecturers} getRowKey={(l) => l.id} />
      </Card>

      <FormSheet isOpen={crud.isOpen} onOpenChange={crud.setIsOpen} title={crud.isEditing ? 'Ubah dosen' : 'Tambah dosen'} onSubmit={crud.submit} isProcessing={processing} errorCount={Object.keys(errors).length}>
        <FormField id="nidn" label="NIDN / NUPTK" error={errors.nidn} isRequired>
          <Input {...fieldA11y('nidn', errors.nidn)} inputMode="numeric" maxLength={10} value={data.nidn} onChange={(e) => setData('nidn', e.target.value.replace(/\D/g, ''))} placeholder="10 digit" />
        </FormField>
        <FormField id="name" label="Nama lengkap & gelar" error={errors.name} isRequired>
          <Input {...fieldA11y('name', errors.name)} value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Gusmayeni, S.Kom., M.Kom" />
        </FormField>
        <FormField id="study_program_id" label="Prodi homebase" error={errors.study_program_id} isRequired>
          <SelectField {...fieldA11y('study_program_id', errors.study_program_id)} isInvalid={!!errors.study_program_id} value={data.study_program_id} options={options.studyPrograms} onValueChange={(v) => setData('study_program_id', v)} />
        </FormField>
        <FormField id="functional_position" label="Jabatan fungsional" error={errors.functional_position}>
          <Input {...fieldA11y('functional_position', errors.functional_position)} value={data.functional_position} onChange={(e) => setData('functional_position', e.target.value)} placeholder="Lektor" />
        </FormField>
        <FormField id="email" label="Email kampus" error={errors.email} isRequired>
          <Input {...fieldA11y('email', errors.email)} type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} placeholder="nama@unpam.ac.id" />
        </FormField>
        <FormField id="phone" label="No. HP" error={errors.phone}>
          <Input {...fieldA11y('phone', errors.phone)} type="tel" inputMode="numeric" maxLength={13} value={data.phone} onChange={(e) => setData('phone', e.target.value.replace(/\D/g, ''))} placeholder="08xxxxxxxxxx" />
        </FormField>
        <FormField id="status" label="Status" error={errors.status} isRequired>
          <SelectField {...fieldA11y('status', errors.status)} isInvalid={!!errors.status} value={data.status} options={options.statuses} onValueChange={(v) => setData('status', v)} />
        </FormField>
      </FormSheet>

      <ConfirmDialog
        isOpen={crud.deleting !== null}
        onOpenChange={(open) => !open && crud.setDeleting(null)}
        title={`Hapus ${crud.deleting?.name ?? ''}?`}
        description="Akun login dosen ikut terhapus. Dosen yang masih mengampu atau menjadi dosen wali tidak bisa dihapus."
        onConfirm={crud.confirmDelete}
      />

      <ConfirmDialog
        isOpen={decision !== null}
        onOpenChange={(open) => !open && setDecision(null)}
        title={decision?.action === 'approve' ? `Setujui ${decision.lecturer.name}?` : `Tolak ${decision?.lecturer.name ?? ''}?`}
        description={decision?.action === 'approve' ? 'Dosen bisa langsung masuk dengan NIDN atau email kampus.' : 'Dosen tidak bisa masuk dan perlu menghubungi admin prodi.'}
        confirmLabel={decision?.action === 'approve' ? 'Setujui' : 'Tolak'}
        isDestructive={decision?.action === 'reject'}
        onConfirm={decide}
      />
    </AppLayout>
  );
}
