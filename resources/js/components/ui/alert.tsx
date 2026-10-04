import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const alertVariants = cva('relative flex w-full gap-3 rounded-xl border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0', {
  variants: {
    variant: {
      default: 'border-border bg-card',
      success: 'border-emerald-200 bg-secondary text-success',
      warning: 'border-amber-200 bg-warning-soft text-warning',
      destructive: 'border-red-200 bg-danger-soft text-destructive',
      info: 'border-blue-200 bg-info-soft text-info',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export { Alert };
