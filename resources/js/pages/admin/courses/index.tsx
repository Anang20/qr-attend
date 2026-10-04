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
import type { Filters, Option, Paginated } from '@/types';

interface CourseRow {
  id: number;
  code: string;
  name: string;
  credits: string;
  semester: string;
  type: string;
  typeLabel: string;
  study_program_id: string;
  studyProgram: string;
  status: string;
  statusLabel: string;
  schedulesCount: number;
}

interface CourseForm {
  code: string;
  name: string;
  credits: string;
  semester: string;
  type: string;
  study_program_id: string;
  status: string;
}

interface Props {
  courses: Paginated<CourseRow>;
  filters: Filters;
  options: { studyPrograms: Option[]; types: Option[]; statuses: Option[]; semesters: Option[] };
}

const URL = '/admin/mata-kuliah';

const creditOptions: Option[] = ['1', '2', '3', '4', '5', '6'].map((v) => ({ value: v, label: `${v} SKS` }));

const emptyForm: CourseForm = { code: '', name: '', credits: '3', semester: '', type: 'wajib', study_program_id: '', status: 'active' };

export default function CoursesIndex({ courses, filters: initialFilters, options }: Props) {
  const { filters, setFilter, reset, isDirty } = useFilters(URL, initialFilters);
  const crud = useResourceForm<CourseRow, CourseForm>(URL, emptyForm, (c) => ({
    code: c.code,
    name: c.name,
    credits: c.credits,
    semester: c.semester,
    type: c.type,
    study_program_id: c.study_program_id,
    status: c.status,
  }));
  const { data, setData, errors, processing } = crud.form;


  const columns: DataTableColumn<CourseRow>[] = [
    { key: 'code', header: 'Kode', className: 'font-bold', cell: (c) => c.code },
    {
      key: 'name',
      header: 'Mata kuliah',
      cell: (c) => (
        <>
          <p className="font-semibold">{c.name}</p>
          <p className="text-xs text-muted-foreground">{c.studyProgram}</p>
        </>
      ),
    },
    { key: 'credits', header: 'SKS', align: 'right', className: 'tabular-nums', cell: (c) => c.credits },
    { key: 'semester', header: 'Semester', align: 'right', className: 'tabular-nums', cell: (c) => c.semester },
    { key: 'type', header: 'Jenis', cell: (c) => c.typeLabel },
    { key: 'mapped', header: 'Dipetakan', align: 'right', className: 'tabular-nums', cell: (c) => c.schedulesCount },
    { key: 'status', header: 'Status', cell: (c) => <Badge variant={c.status === 'active' ? 'success' : 'muted'}>{c.statusLabel}</Badge> },
    {
      key: 'actions',
      header: 'Aksi',
      isHeaderHidden: true,
      headClassName: 'w-24',
      cell: (c) => <RowActions name={c.name} onEdit={() => crud.openEdit(c)} onDelete={() => crud.setDeleting(c)} />,
    },
  ];

  return (
    <AppLayout title="Mata Kuliah">
      <PageHeader
        title="Mata Kuliah"
        description="SKS menentukan durasi kuliah saat pemetaan (1 SKS = 50 menit)."
        actions={
          <Button onClick={crud.openCreate}>
            <Plus aria-hidden />
            Tambah mata kuliah
          </Button>
        }
      />

      <Card className="gap-4">
        <DataToolbar search={filters.q ?? ''} onSearchChange={(v) => setFilter('q', v)} searchPlaceholder="Cari kode atau nama mata kuliah" isDirty={isDirty} onReset={reset} total={courses.total}>
          <SelectField aria-label="Filter program studi" className="w-48" value={filters.study_program_id} options={options.studyPrograms} allLabel="Semua prodi" onValueChange={(v) => setFilter('study_program_id', v)} />
          <SelectField aria-label="Filter semester" className="w-40" value={filters.semester} options={options.semesters} allLabel="Semua semester" onValueChange={(v) => setFilter('semester', v)} />
          <SelectField aria-label="Filter status" className="w-36" value={filters.status} options={options.statuses} allLabel="Semua status" onValueChange={(v) => setFilter('status', v)} />
        </DataToolbar>

        <DataTable columns={columns} rows={courses} getRowKey={(c) => c.id} />
      </Card>

      <FormSheet isOpen={crud.isOpen} onOpenChange={crud.setIsOpen} title={crud.isEditing ? 'Ubah mata kuliah' : 'Tambah mata kuliah'} onSubmit={crud.submit} isProcessing={processing} errorCount={Object.keys(errors).length}>
        <FormField id="code" label="Kode mata kuliah" error={errors.code} hint="Contoh: IF-305" isRequired>
          <Input {...fieldA11y('code', errors.code)} value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} maxLength={10} />
        </FormField>
        <FormField id="name" label="Nama mata kuliah" error={errors.name} isRequired>
          <Input {...fieldA11y('name', errors.name)} value={data.name} onChange={(e) => setData('name', e.target.value)} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField id="credits" label="SKS" error={errors.credits} isRequired>
            <SelectField {...fieldA11y('credits', errors.credits)} isInvalid={!!errors.credits} value={data.credits} options={creditOptions} onValueChange={(v) => setData('credits', v)} />
          </FormField>
          <FormField id="semester" label="Semester" error={errors.semester} isRequired>
            <SelectField {...fieldA11y('semester', errors.semester)} isInvalid={!!errors.semester} value={data.semester} options={options.semesters} onValueChange={(v) => setData('semester', v)} />
          </FormField>
          <FormField id="type" label="Jenis" error={errors.type} isRequired>
            <SelectField {...fieldA11y('type', errors.type)} isInvalid={!!errors.type} value={data.type} options={options.types} onValueChange={(v) => setData('type', v)} />
          </FormField>
          <FormField id="status" label="Status" error={errors.status} isRequired>
            <SelectField {...fieldA11y('status', errors.status)} isInvalid={!!errors.status} value={data.status} options={options.statuses} onValueChange={(v) => setData('status', v)} />
          </FormField>
        </div>
        <FormField id="study_program_id" label="Program studi" error={errors.study_program_id} isRequired>
          <SelectField {...fieldA11y('study_program_id', errors.study_program_id)} isInvalid={!!errors.study_program_id} value={data.study_program_id} options={options.studyPrograms} onValueChange={(v) => setData('study_program_id', v)} />
        </FormField>
      </FormSheet>

      <ConfirmDialog
        isOpen={crud.deleting !== null}
        onOpenChange={(open) => !open && crud.setDeleting(null)}
        title={`Hapus ${crud.deleting?.name ?? ''}?`}
        description="Mata kuliah yang sudah dipetakan ke kelas tidak bisa dihapus; ubah statusnya menjadi Nonaktif."
        onConfirm={crud.confirmDelete}
      />
    </AppLayout>
  );
}
