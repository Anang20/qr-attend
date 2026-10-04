import { router } from '@inertiajs/react';
import { RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';

import { SelectField } from '@/components/app/select-field';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ALL } from '@/hooks/use-filters';
import type { Option } from '@/types';

export interface ChartFilters {
  period_id: string;
  range: string;
  course_id: string | null;
  class_group_id: string | null;
}

export interface ChartFilterOptions {
  periods: Option[];
  ranges: Option[];
  courses: Option[];
  classGroups: Option[];
}

interface ChartFilterBarProps {
  url: string;
  filters: ChartFilters;
  options: ChartFilterOptions;
  /** Dipanggil saat muat ulang dimulai/selesai (untuk meredupkan grafik, bukan mengosongkannya). */
  onLoadingChange: (isLoading: boolean) => void;
}

/** Props server yang dimuat ulang saat filter berubah (partial reload Inertia). */
const RELOAD_PROPS = ['attendance', 'chartFilters', 'chartOptions'];

/**
 * Filter global grafik dasbor. Alur: pilihan → router.get(query) → DashboardFilter (server)
 * → DashboardStats → props `attendance` baru → semua grafik & angka ikut berubah bersama.
 */
export function ChartFilterBar({ url, filters, options, onLoadingChange }: ChartFilterBarProps) {
  const apply = (next: ChartFilters) => {
    const query = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== null && v !== ''));
    router.get(url, query, {
      only: RELOAD_PROPS,
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onStart: () => onLoadingChange(true),
      onFinish: () => onLoadingChange(false),
    });
  };

  const change = (key: keyof ChartFilters, value: string) => {
    const v = value === ALL ? null : value;
    // Mata kuliah & kelas bergantung pada periode → dikosongkan saat periode berganti.
    const next: ChartFilters = key === 'period_id' ? { ...filters, period_id: value, course_id: null, class_group_id: null } : { ...filters, [key]: v };
    apply(next);
  };

  const isDirty = filters.range !== 'all' || filters.course_id !== null || filters.class_group_id !== null;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4" role="search" aria-label="Filter grafik">
      <Field id="cf-range" label="Rentang">
        <SelectField id="cf-range" className="w-44" value={filters.range} options={options.ranges} onValueChange={(v) => change('range', v)} />
      </Field>
      <Field id="cf-period" label="Periode">
        <SelectField id="cf-period" className="w-48" value={filters.period_id} options={options.periods} onValueChange={(v) => change('period_id', v)} />
      </Field>
      <Field id="cf-course" label="Mata kuliah">
        <SelectField id="cf-course" className="w-60" value={filters.course_id ?? undefined} options={options.courses} allLabel="Semua mata kuliah" onValueChange={(v) => change('course_id', v)} />
      </Field>
      <Field id="cf-class" label="Kelas">
        <SelectField id="cf-class" className="w-40" value={filters.class_group_id ?? undefined} options={options.classGroups} allLabel="Semua kelas" onValueChange={(v) => change('class_group_id', v)} />
      </Field>
      {isDirty && (
        <Button type="button" variant="ghost" onClick={() => apply({ period_id: filters.period_id, range: 'all', course_id: null, class_group_id: null })}>
          <RotateCcw aria-hidden />
          Atur ulang
        </Button>
      )}
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}
