import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  isHighlighted?: boolean;
  tone?: 'default' | 'warning';
}

export function StatCard({ label, value, sub, icon: Icon, isHighlighted = false, tone = 'default' }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-2xl border bg-card p-5',
        isHighlighted && 'border-transparent bg-brand-deep text-white',
        tone === 'warning' && !isHighlighted && 'border-amber-200 bg-warning-soft',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-sm', isHighlighted ? 'text-emerald-100' : 'text-muted-foreground')}>{label}</span>
        {Icon && <Icon className={cn('size-5', isHighlighted ? 'text-emerald-200' : 'text-primary')} aria-hidden />}
      </div>
      <span className="text-3xl leading-none font-extrabold">{typeof value === 'number' ? value.toLocaleString('id-ID') : value}</span>
      {sub && <span className={cn('text-xs', isHighlighted ? 'text-emerald-100/80' : 'text-muted-foreground')}>{sub}</span>}
    </div>
  );
}
