import { router } from '@inertiajs/react';
import { Plus, Smartphone } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { DataToolbar } from '@/components/app/data-toolbar';
import { fieldA11y, FormField } from '@/components/app/form-field';
import { FormSheet } from '@/components/app/form-sheet';
import { PageHeader } from '@/components/app/page-header';
import { RowActions } from '@/components/app/row-actions';
import { SelectField } from '@/components/app/select-field';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFilters } from '@/hooks/use-filters';
import { useResourceForm } from '@/hooks/use-resource-form';
import AppLayout from '@/layouts/app-layout';
import type { Filters, Option, Paginated } from '@/types';

interface StudentRow {
  id: number;
  nim: string;
  name: string;
  email: string;
  phone: string | null;
  study_program_id: string;
  studyProgram: string;
  cohort_year: string;
  class_group_id: string;
  classGroup: string;
  status: string;
  statusLabel: string;
  accountStatus: string;
  accountStatusLabel: string;
  hasDevice: boolean;
}

interface StudentForm {
  nim: string;
  name: string;
  email: string;
  phone: string;
  study_program_id: string;
  cohort_year: string;
  class_group_id: string;
  status: string;
}

interface ClassOption extends Option {
  studyProgramId: string;
  cohortYear: string;
}

interface Props {
  students: Paginated<StudentRow>;
  filters: Filters;
  options: { studyPrograms: Option[]; classGroups: ClassOption[]; cohortYears: Option[]; statuses: Option[] };
}

const URL = '/admin/mahasiswa';

const statusVariant: Record<string, BadgeVariant> = { active: 'success', leave: 'warning', graduated: 'info', dropped: 'muted' };

const emptyForm: StudentForm = { nim: '', name: '', email: '', phone: '', study_program_id: '', cohort_year: '', class_group_id: '', status: 'active' };

export default function StudentsIndex({ students, filters: initialFilters, options }: Props) {
  const { filters, setFilter, reset, isDirty } = useFilters(URL, initialFilters);
  const crud = useResourceForm<StudentRow, StudentForm>(URL, emptyForm, (s) => ({
    nim: s.nim,
    name: s.name,
    email: s.email,
    phone: s.phone ?? '',
    study_program_id: s.study_program_id,
    cohort_year: s.cohort_year,
    class_group_id: s.class_group_id,
    status: s.status,
  }));
  const { data, setData, errors, processing } = crud.form;
  const [resetting, setResetting] = useState<StudentRow | null>(null);

  const formClassOptions = useMemo(
    () => options.classGroups.filter((c) => c.studyProgramId === data.study_program_id && c.cohortYear === data.cohort_year),
    [options.classGroups, data.study_program_id, data.cohort_year],
  );


  const columns: DataTableColumn<StudentRow>[] = [
    {
      key: 'name',
      header: 'Mahasiswa',
      cell: (s) => (
        <>
          <p className="font-bold">{s.name}</p>
          <p className="text-xs text-muted-foreground">{s.email}</p>
        </>
      ),
    },
    { key: 'nim', header: 'NIM', className: 'tabular-nums', cell: (s) => s.nim },
    { key: 'class', header: 'Kelas', cell: (s) => s.classGroup },
    { key: 'cohort', header: 'Angkatan', cell: (s) => s.cohort_year },
    { key: 'status', header: 'Status', cell: (s) => <Badge variant={statusVariant[s.status] ?? 'muted'}>{s.statusLabel}</Badge> },
    {
      key: 'account',
      header: 'Akun',
      cell: (s) => <Badge variant={s.accountStatus === 'active' ? 'success' : s.accountStatus === 'pending' ? 'warning' : 'muted'}>{s.accountStatusLabel}</Badge>,
    },
    {
      key: 'device',
      header: 'Perangkat',
      cell: (s) =>
        s.hasDevice ? (
          <Button variant="ghost" size="sm" onClick={() => setResetting(s)} aria-label={`Reset perangkat ${s.name}`}>
            <Smartphone aria-hidden />
            Terikat
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Belum</span>
        ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      isHeaderHidden: true,
      headClassName: 'w-24',
      cell: (s) => <RowActions name={s.name} onEdit={() => crud.openEdit(s)} onDelete={() => crud.setDeleting(s)} />,
    },
  ];

  return (
    <AppLayout title="Mahasiswa">
      <PageHeader
        title="Mahasiswa"
        description={`${students.total.toLocaleString('id-ID')} mahasiswa terdaftar. Akun yang dibuat admin memakai kata sandi awal = NIM.`}
        actions={
          <Button onClick={crud.openCreate}>
            <Plus aria-hidden />
            Tambah mahasiswa
          </Button>
        }
      />

      <Card className="gap-4">
        <DataToolbar search={filters.q ?? ''} onSearchChange={(v) => setFilter('q', v)} searchPlaceholder="Cari nama atau NIM" isDirty={isDirty} onReset={reset} total={students.total}>
          <SelectField aria-label="Filter angkatan" className="w-40" value={filters.cohort_year} options={options.cohortYears} allLabel="Semua angkatan" onValueChange={(v) => setFilter('cohort_year', v)} />
          <SelectField aria-label="Filter kelas" className="w-36" value={filters.class_group_id} options={options.classGroups} allLabel="Semua kelas" onValueChange={(v) => setFilter('class_group_id', v)} />
          <SelectField aria-label="Filter status" className="w-36" value={filters.status} options={options.statuses} allLabel="Semua status" onValueChange={(v) => setFilter('status', v)} />
        </DataToolbar>

        <DataTable columns={columns} rows={students} getRowKey={(s) => s.id} />
      </Card>

      <FormSheet isOpen={crud.isOpen} onOpenChange={crud.setIsOpen} title={crud.isEditing ? 'Ubah mahasiswa' : 'Tambah mahasiswa'} onSubmit={crud.submit} isProcessing={processing} errorCount={Object.keys(errors).length}>
        <FormField id="nim" label="NIM" error={errors.nim} isRequired>
          <Input {...fieldA11y('nim', errors.nim)} inputMode="numeric" maxLength={12} value={data.nim} onChange={(e) => setData('nim', e.target.value.replace(/\D/g, ''))} placeholder="12 digit" />
        </FormField>
        <FormField id="name" label="Nama lengkap" error={errors.name} isRequired>
          <Input {...fieldA11y('name', errors.name)} value={data.name} onChange={(e) => setData('name', e.target.value)} />
        </FormField>
        <FormField id="study_program_id" label="Program studi" error={errors.study_program_id} isRequired>
          <SelectField {...fieldA11y('study_program_id', errors.study_program_id)} isInvalid={!!errors.study_program_id} value={data.study_program_id} options={options.studyPrograms} onValueChange={(v) => setData((d) => ({ ...d, study_program_id: v, class_group_id: '' }))} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField id="cohort_year" label="Angkatan" error={errors.cohort_year} isRequired>
            <SelectField {...fieldA11y('cohort_year', errors.cohort_year)} isInvalid={!!errors.cohort_year} value={data.cohort_year} options={options.cohortYears} onValueChange={(v) => setData((d) => ({ ...d, cohort_year: v, class_group_id: '' }))} />
          </FormField>
          <FormField id="class_group_id" label="Kelas" error={errors.class_group_id} isRequired>
            <SelectField
              {...fieldA11y('class_group_id', errors.class_group_id)}
              isInvalid={!!errors.class_group_id}
              value={data.class_group_id}
              options={formClassOptions}
              isDisabled={formClassOptions.length === 0}
              placeholder={formClassOptions.length === 0 ? 'Tidak ada kelas' : 'Pilih kelas'}
              onValueChange={(v) => setData('class_group_id', v)}
            />
          </FormField>
        </div>
        <FormField id="email" label="Email kampus" error={errors.email} isRequired>
          <Input {...fieldA11y('email', errors.email)} type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} placeholder="nama.0032@student.unpam.ac.id" />
        </FormField>
        <FormField id="phone" label="No. HP" error={errors.phone}>
          <Input {...fieldA11y('phone', errors.phone)} type="tel" inputMode="numeric" maxLength={13} value={data.phone} onChange={(e) => setData('phone', e.target.value.replace(/\D/g, ''))} placeholder="08xxxxxxxxxx" />
        </FormField>
        <FormField id="status" label="Status akademik" error={errors.status} isRequired>
          <SelectField {...fieldA11y('status', errors.status)} isInvalid={!!errors.status} value={data.status} options={options.statuses} onValueChange={(v) => setData('status', v)} />
        </FormField>
      </FormSheet>

      <ConfirmDialog
        isOpen={crud.deleting !== null}
        onOpenChange={(open) => !open && crud.setDeleting(null)}
        title={`Hapus ${crud.deleting?.name ?? ''}?`}
        description="Akun login mahasiswa ikut terhapus. Mahasiswa yang sudah punya data presensi tidak bisa dihapus."
        onConfirm={crud.confirmDelete}
      />

      <ConfirmDialog
        isOpen={resetting !== null}
        onOpenChange={(open) => !open && setResetting(null)}
        title={`Reset perangkat ${resetting?.name ?? ''}?`}
        description="Perangkat lama dicabut. Ponsel berikutnya yang dipakai mahasiswa untuk masuk akan diikat ke akunnya."
        confirmLabel="Reset perangkat"
        onConfirm={() => resetting && router.post(`${URL}/${resetting.id}/reset-perangkat`, {}, { preserveScroll: true, onFinish: () => setResetting(null) })}
      />
    </AppLayout>
  );
}
