import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  isRequired?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Label + kontrol + pesan galat. Kontrol di dalamnya sebaiknya memakai
 * id yang sama dan aria-invalid / aria-describedby dari fieldA11y().
 */
export function FormField({ id, label, error, hint, isRequired = false, className, children }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>
        {label}
        {isRequired && <span className="text-destructive" aria-hidden>*</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Atribut aksesibilitas untuk kontrol di dalam FormField. */
export function fieldA11y(id: string, error?: string) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : `${id}-hint`,
  } as const;
}
