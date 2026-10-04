import { Plus } from 'lucide-react';

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
import { formatDate } from '@/lib/utils';
import type { Filters, Option, Paginated } from '@/types';

interface PeriodRow {
  id: number;
  label: string;
  academic_year: string;
  semester: string;
  start_date: string;
  end_date: string;
  status: string;
  statusLabel: string;
  classSchedulesCount: number;
  openedSessionsCount: number;
}

interface PeriodForm {
  academic_year: string;
  semester: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Props {
  periods: Paginated<PeriodRow>;
  filters: Filters;
  semesters: Option[];
  statuses: Option[];
}

const URL = '/admin/periode-akademik';

const statusVariant: Record<string, BadgeVariant> = { active: 'success', upcoming: 'info', finished: 'muted' };

const emptyForm: PeriodForm = { academic_year: '', semester: '', start_date: '', end_date: '', status: 'upcoming' };

export default function AcademicPeriodsIndex({ periods, filters: initialFilters, semesters, statuses }: Props) {
  const { filters, setFilter, reset, isDirty } = useFilters(URL, initialFilters);
  const crud = useResourceForm<PeriodRow, PeriodForm>(URL, emptyForm, (p) => ({
    academic_year: p.academic_year,
    semester: p.semester,
    start_date: p.start_date,
    end_date: p.end_date,
    status: p.status,
  }));
  const { data, setData, errors, processing } = crud.form;


  const columns: DataTableColumn<PeriodRow>[] = [
    { key: 'label', header: 'Periode', className: 'font-bold', cell: (p) => p.label },
    { key: 'start', header: 'Mulai', cell: (p) => formatDate(p.start_date) },
    { key: 'end', header: 'Selesai', cell: (p) => formatDate(p.end_date) },
    { key: 'classes', header: 'Kelas terpetakan', align: 'right', className: 'tabular-nums', cell: (p) => p.classSchedulesCount },
    { key: 'sessions', header: 'Sesi presensi', align: 'right', className: 'tabular-nums', cell: (p) => p.openedSessionsCount },
    { key: 'status', header: 'Status', cell: (p) => <Badge variant={statusVariant[p.status] ?? 'muted'}>{p.statusLabel}</Badge> },
    {
      key: 'actions',
      header: 'Aksi',
      isHeaderHidden: true,
      headClassName: 'w-24',
      cell: (p) => <RowActions name={p.label} onEdit={() => crud.openEdit(p)} onDelete={() => crud.setDeleting(p)} />,
    },
  ];

  return (
    <AppLayout title="Periode Akademik">
      <PageHeader
        title="Periode Akademik"
        description="Hanya satu periode yang boleh Aktif. Mengaktifkan periode baru otomatis menyelesaikan periode sebelumnya."
        actions={
          <Button onClick={crud.openCreate}>
            <Plus aria-hidden />
            Tambah periode
          </Button>
        }
      />

      <Card className="gap-4">
        <DataToolbar
          search={filters.q ?? ''}
          onSearchChange={(v) => setFilter('q', v)}
          searchPlaceholder="Cari tahun ajaran"
          isDirty={isDirty}
          onReset={reset}
          total={periods.total}
        >
          <SelectField aria-label="Filter status" className="w-44" value={filters.status} options={statuses} allLabel="Semua status" onValueChange={(v) => setFilter('status', v)} />
        </DataToolbar>

        <DataTable columns={columns} rows={periods} getRowKey={(p) => p.id} />
      </Card>

      <FormSheet
        isOpen={crud.isOpen}
        onOpenChange={crud.setIsOpen}
        title={crud.isEditing ? 'Ubah periode' : 'Tambah periode'}
        onSubmit={crud.submit}
        isProcessing={processing}
        errorCount={Object.keys(errors).length}
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField id="academic_year" label="Tahun ajaran" error={errors.academic_year} hint="Contoh: 2026/2027" isRequired>
            <Input {...fieldA11y('academic_year', errors.academic_year)} value={data.academic_year} onChange={(e) => setData('academic_year', e.target.value)} placeholder="2026/2027" maxLength={9} />
          </FormField>
          <FormField id="semester" label="Semester" error={errors.semester} isRequired>
            <SelectField {...fieldA11y('semester', errors.semester)} isInvalid={!!errors.semester} value={data.semester} options={semesters} onValueChange={(v) => setData('semester', v)} />
          </FormField>
          <FormField id="start_date" label="Tanggal mulai" error={errors.start_date} isRequired>
            <Input {...fieldA11y('start_date', errors.start_date)} type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} />
          </FormField>
          <FormField id="end_date" label="Tanggal selesai" error={errors.end_date} isRequired>
            <Input {...fieldA11y('end_date', errors.end_date)} type="date" min={data.start_date || undefined} value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} />
          </FormField>
        </div>
        <FormField id="status" label="Status" error={errors.status} hint="Memilih Aktif akan menjadikan periode aktif lain Selesai." isRequired>
          <SelectField {...fieldA11y('status', errors.status)} isInvalid={!!errors.status} value={data.status} options={statuses} onValueChange={(v) => setData('status', v)} />
        </FormField>
      </FormSheet>

      <ConfirmDialog
        isOpen={crud.deleting !== null}
        onOpenChange={(open) => !open && crud.setDeleting(null)}
        title={`Hapus ${crud.deleting?.label ?? ''}?`}
        description="Periode yang sudah punya pemetaan kelas atau berstatus Aktif tidak bisa dihapus."
        onConfirm={crud.confirmDelete}
      />
    </AppLayout>
  );
}
