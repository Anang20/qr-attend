import { Plus } from 'lucide-react';

import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { DataToolbar } from '@/components/app/data-toolbar';
import { fieldA11y, FormField } from '@/components/app/form-field';
import { FormSheet } from '@/components/app/form-sheet';
import { PageHeader } from '@/components/app/page-header';
import { RowActions } from '@/components/app/row-actions';
import { SelectField } from '@/components/app/select-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFilters } from '@/hooks/use-filters';
import { useResourceForm } from '@/hooks/use-resource-form';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { Filters, Option, Paginated } from '@/types';

interface ClassRow {
  id: number;
  code: string;
  study_program_id: string;
  studyProgram: string;
  cohort_year: string;
  advisor_lecturer_id: string;
  advisor: string | null;
  capacity: string;
  studentsCount: number;
  status: string;
  statusLabel: string;
}

interface ClassForm {
  code: string;
  study_program_id: string;
  cohort_year: string;
  advisor_lecturer_id: string;
  capacity: string;
  status: string;
}

interface Props {
  classGroups: Paginated<ClassRow>;
  filters: Filters;
  options: { studyPrograms: Option[]; lecturers: Option[]; cohortYears: Option[]; statuses: Option[] };
}

const URL = '/admin/kelas';
const NONE = 'none';

const emptyForm: ClassForm = { code: '', study_program_id: '', cohort_year: '', advisor_lecturer_id: '', capacity: '40', status: 'active' };

export default function ClassGroupsIndex({ classGroups, filters: initialFilters, options }: Props) {
  const { filters, setFilter, reset, isDirty } = useFilters(URL, initialFilters);
  const crud = useResourceForm<ClassRow, ClassForm>(URL, emptyForm, (c) => ({
    code: c.code,
    study_program_id: c.study_program_id,
    cohort_year: c.cohort_year,
    advisor_lecturer_id: c.advisor_lecturer_id,
    capacity: c.capacity,
    status: c.status,
  }));
  const { data, setData, errors, processing } = crud.form;
  const advisorOptions: Option[] = [{ value: NONE, label: 'Belum ada' }, ...options.lecturers];


  const columns: DataTableColumn<ClassRow>[] = [
    {
      key: 'code',
      header: 'Kelas',
      cell: (c) => (
        <>
          <p className="font-bold">{c.code}</p>
          <p className="text-xs text-muted-foreground">{c.studyProgram}</p>
        </>
      ),
    },
    { key: 'cohort', header: 'Angkatan', cell: (c) => c.cohort_year },
    { key: 'advisor', header: 'Dosen wali', cell: (c) => c.advisor ?? <span className="text-muted-foreground">Belum ada</span> },
    {
      key: 'students',
      header: 'Mahasiswa',
      align: 'right',
      // Kelas penuh ditandai kuning.
      className: (c) => cn('tabular-nums', c.studentsCount >= Number(c.capacity) && 'font-bold text-warning'),
      cell: (c) => `${c.studentsCount} / ${c.capacity}`,
    },
    { key: 'status', header: 'Status', cell: (c) => <Badge variant={c.status === 'active' ? 'success' : 'muted'}>{c.statusLabel}</Badge> },
    {
      key: 'actions',
      header: 'Aksi',
      isHeaderHidden: true,
      headClassName: 'w-24',
      cell: (c) => <RowActions name={`kelas ${c.code}`} onEdit={() => crud.openEdit(c)} onDelete={() => crud.setDeleting(c)} />,
    },
  ];

  return (
    <AppLayout title="Kelas">
      <PageHeader
        title="Kelas"
        description="Rombongan belajar per angkatan. Mahasiswa mengikuti semua mata kuliah yang dipetakan ke kelasnya."
        actions={
          <Button onClick={crud.openCreate}>
            <Plus aria-hidden />
            Tambah kelas
          </Button>
        }
      />

      <Card className="gap-4">
        <DataToolbar search={filters.q ?? ''} onSearchChange={(v) => setFilter('q', v)} searchPlaceholder="Cari kode kelas" isDirty={isDirty} onReset={reset} total={classGroups.total}>
          <SelectField aria-label="Filter angkatan" className="w-40" value={filters.cohort_year} options={options.cohortYears} allLabel="Semua angkatan" onValueChange={(v) => setFilter('cohort_year', v)} />
          <SelectField aria-label="Filter status" className="w-36" value={filters.status} options={options.statuses} allLabel="Semua status" onValueChange={(v) => setFilter('status', v)} />
        </DataToolbar>

        <DataTable columns={columns} rows={classGroups} getRowKey={(c) => c.id} />
      </Card>

      <FormSheet isOpen={crud.isOpen} onOpenChange={crud.setIsOpen} title={crud.isEditing ? 'Ubah kelas' : 'Tambah kelas'} onSubmit={crud.submit} isProcessing={processing} errorCount={Object.keys(errors).length}>
        <FormField id="code" label="Kode kelas" error={errors.code} hint="Bebas, maksimal 10 karakter. Contoh: SI-5A" isRequired>
          <Input {...fieldA11y('code', errors.code)} value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} maxLength={10} />
        </FormField>
        <FormField id="study_program_id" label="Program studi" error={errors.study_program_id} isRequired>
          <SelectField {...fieldA11y('study_program_id', errors.study_program_id)} isInvalid={!!errors.study_program_id} value={data.study_program_id} options={options.studyPrograms} onValueChange={(v) => setData('study_program_id', v)} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField id="cohort_year" label="Angkatan" error={errors.cohort_year} isRequired>
            <SelectField {...fieldA11y('cohort_year', errors.cohort_year)} isInvalid={!!errors.cohort_year} value={data.cohort_year} options={options.cohortYears} onValueChange={(v) => setData('cohort_year', v)} />
          </FormField>
          <FormField id="capacity" label="Kapasitas" error={errors.capacity} isRequired>
            <Input {...fieldA11y('capacity', errors.capacity)} type="number" min={5} max={200} value={data.capacity} onChange={(e) => setData('capacity', e.target.value)} />
          </FormField>
        </div>
        <FormField id="advisor_lecturer_id" label="Dosen wali" error={errors.advisor_lecturer_id}>
          <SelectField
            {...fieldA11y('advisor_lecturer_id', errors.advisor_lecturer_id)}
            isInvalid={!!errors.advisor_lecturer_id}
            value={data.advisor_lecturer_id || NONE}
            options={advisorOptions}
            onValueChange={(v) => setData('advisor_lecturer_id', v === NONE ? '' : v)}
          />
        </FormField>
        <FormField id="status" label="Status" error={errors.status} isRequired>
          <SelectField {...fieldA11y('status', errors.status)} isInvalid={!!errors.status} value={data.status} options={options.statuses} onValueChange={(v) => setData('status', v)} />
        </FormField>
      </FormSheet>

      <ConfirmDialog
        isOpen={crud.deleting !== null}
        onOpenChange={(open) => !open && crud.setDeleting(null)}
        title={`Hapus kelas ${crud.deleting?.code ?? ''}?`}
        description="Kelas yang masih punya mahasiswa atau pemetaan tidak bisa dihapus; ubah statusnya menjadi Nonaktif."
        onConfirm={crud.confirmDelete}
      />
    </AppLayout>
  );
}
