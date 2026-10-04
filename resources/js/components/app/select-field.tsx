import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ALL } from '@/hooks/use-filters';
import type { Option } from '@/types';

interface SelectFieldProps {
  id?: string;
  value: string | undefined;
  options: Option[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Tambahkan opsi "Semua …" (untuk filter). */
  allLabel?: string;
  isInvalid?: boolean;
  isDisabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export function SelectField({
  id,
  value,
  options,
  onValueChange,
  placeholder = 'Pilih…',
  allLabel,
  isInvalid,
  isDisabled,
  className,
  ...aria
}: SelectFieldProps) {
  const current = value === undefined || value === '' ? (allLabel ? ALL : undefined) : value;

  return (
    <Select value={current} onValueChange={onValueChange} disabled={isDisabled}>
      <SelectTrigger id={id} aria-invalid={isInvalid || undefined} className={className} {...aria}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
