import { Link, usePage } from '@inertiajs/react';
import { QrCode } from 'lucide-react';

import { navigation, type NavItem } from '@/components/app/navigation';
import { cn } from '@/lib/utils';
import type { SharedProps } from '@/types';

function isActive(item: NavItem, url: string): boolean {
  if (!item.href) return false;
  const [path = url, query = ''] = url.split('?');
  const [href = item.href, hrefQuery] = item.href.split('?');
  // Tautan dengan query (mis. Riwayat = ?when=past) aktif hanya bila query-nya sama.
  if (hrefQuery !== undefined) return path === href && query.includes(hrefQuery);
  return item.exact ? path === href : path === href || path.startsWith(`${href}/`);
}

export function AppLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand-deep text-white">
        <QrCode className="size-5" aria-hidden />
      </span>
      <span className="text-lg font-extrabold tracking-tight">QR Attend</span>
    </div>
  );
}

/** Menu navigasi per peran. Dipakai di sidebar desktop dan drawer mobile. */
export function AppNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const { auth, badges } = usePage<SharedProps>().props;
  const { url } = usePage();

  if (!auth.user) return null;

  return (
    <nav aria-label="Menu utama" className="flex flex-col gap-6">
      {navigation[auth.user.role].map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{group.label}</p>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item, url);

            if (!item.href) {
              return (
                <span
                  key={item.label}
                  aria-disabled="true"
                  title="Tersedia di tahap berikutnya"
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground/70"
                >
                  <Icon className="size-[18px]" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">Segera</span>
                </span>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                  active && 'bg-secondary font-bold text-primary before:absolute before:inset-y-2 before:-left-0 before:w-1 before:rounded-full before:bg-emerald-500',
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.badgeKey && (badges?.[item.badgeKey] ?? 0) > 0 && (
                  <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-warning" aria-label={`${badges[item.badgeKey]} menunggu`}>
                    {badges[item.badgeKey]}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AppSidebar() {
  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col gap-8 overflow-y-auto rounded-3xl border bg-card p-5 lg:flex print:hidden">
      <AppLogo />
      <AppNavigation />
    </aside>
  );
}
