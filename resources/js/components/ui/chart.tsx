/**
 * Komponen chart shadcn/ui (pembungkus Recharts).
 * ChartConfig memetakan kunci data → label + warna; warna diekspos sebagai CSS variable
 * `--color-<kunci>` sehingga mark Recharts cukup memakai `fill="var(--color-present)"`.
 */
import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '@/lib/utils';

export type ChartConfig = Record<string, { label: React.ReactNode; color?: string; icon?: React.ComponentType }>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('useChart harus dipakai di dalam <ChartContainer />');
  }
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          'flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke=\'#ccc\']]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-hidden [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/60 [&_.recharts-reference-line_[stroke=\'#ccc\']]:stroke-border [&_.recharts-surface]:outline-hidden',
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

/** Menulis `--color-<kunci>` untuk setiap seri. Nilai berasal dari konfigurasi kode, bukan input pengguna. */
function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(([, c]) => c.color);
  if (entries.length === 0) return null;
  const css = `[data-chart=${id}] {\n${entries.map(([key, c]) => `  --color-${key}: ${c.color};`).join('\n')}\n}`;
  return <style>{css}</style>;
}

const ChartTooltip = RechartsPrimitive.Tooltip;

interface TooltipItem {
  dataKey?: string | number | ((obj: unknown) => unknown);
  name?: string | number;
  value?: number | string | ReadonlyArray<number | string>;
  color?: string;
  payload?: Record<string, unknown>;
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipItem>;
  label?: React.ReactNode;
  /** Ubah label sumbu-X (mis. tanggal ISO → "28 Sep"). */
  labelFormatter?: (label: React.ReactNode) => React.ReactNode;
  /** Format nilai (mis. 92.6 → "92,6%"). */
  valueFormatter?: (value: number) => string;
  hideLabel?: boolean;
  className?: string;
}

/** Isi tooltip: nilai tebal di depan, nama seri di belakang, kunci berupa garis pendek warna seri. */
function ChartTooltipContent({ active, payload, label, labelFormatter, valueFormatter, hideLabel = false, className }: ChartTooltipContentProps) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div className={cn('grid min-w-36 gap-1.5 rounded-xl border bg-background px-3 py-2 text-xs shadow-lg', className)}>
      {!hideLabel && <div className="font-semibold">{labelFormatter ? labelFormatter(label) : label}</div>}
      {payload.map((item, i) => {
        const key = String(item.dataKey ?? item.name ?? i);
        const itemConfig = config[key];
        const raw = typeof item.value === 'number' ? item.value : Number(item.value);
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color ?? `var(--color-${key})` }} aria-hidden />
            <span className="font-bold tabular-nums">{Number.isFinite(raw) && valueFormatter ? valueFormatter(raw) : String(item.value ?? '')}</span>
            <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
          </div>
        );
      })}
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

interface ChartLegendContentProps {
  /** Kunci seri yang disembunyikan (klik legenda untuk menyembunyikan/menampilkan). */
  hiddenKeys?: ReadonlySet<string>;
  onToggle?: (key: string) => void;
  className?: string;
}

/**
 * Legenda berbasis ChartConfig (urutan tetap mengikuti config, bukan data),
 * sehingga warna mengikuti seri dan tidak berubah saat seri disembunyikan.
 */
function ChartLegendContent({ hiddenKeys, onToggle, className }: ChartLegendContentProps) {
  const { config } = useChart();
  return (
    <ul className={cn('flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3', className)}>
      {Object.entries(config).map(([key, item]) => {
        const isHidden = hiddenKeys?.has(key) ?? false;
        const swatch = <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: `var(--color-${key})` }} aria-hidden />;
        return (
          <li key={key}>
            {onToggle ? (
              <button
                type="button"
                aria-pressed={!isHidden}
                onClick={() => onToggle(key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-muted-foreground hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                  isHidden && 'line-through opacity-50',
                )}
              >
                {swatch}
                {item.label}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                {swatch}
                {item.label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export { ChartContainer, ChartLegend, ChartLegendContent, ChartStyle, ChartTooltip, ChartTooltipContent };
