/**
 * Grafik dasbor admin berbasis Recharts melalui komponen chart shadcn/ui.
 *
 * Alur data: DashboardStats (server, sudah tersaring filter global) → props → chart.
 * Kontrol di dalam kartu (urutan, Top N, sembunyikan seri) hanya mengubah TAMPILAN data
 * yang sudah dimuat — tanpa request ulang — sehingga angka tetap sama dengan filter global.
 */
import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, XAxis, YAxis } from 'recharts';

import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn, formatNumber } from '@/lib/utils';

/** Warna seri (lolos validasi CVD & kontras terhadap latar putih; kuning wajib ditemani label/tooltip). */
const COLOR = {
  primary: 'var(--primary)',
  present: '#047857',
  late: '#f59e0b',
  absent: '#dc2626',
  excused: '#2563eb',
} as const;

const pct = (v: number) => `${formatNumber(v, v % 1 === 0 ? 0 : 1)}%`;
const dayLabel = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' });
const formatDay = (iso: unknown) => (typeof iso === 'string' ? dayLabel.format(new Date(`${iso}T00:00:00`)) : String(iso ?? ''));
const formatMonth = (ym: unknown) => (typeof ym === 'string' ? monthLabel.format(new Date(`${ym}-01T00:00:00`)) : String(ym ?? ''));

/* ------------------------------------------------------------------ */
/* Kontrol tampilan per chart                                          */
/* ------------------------------------------------------------------ */

interface ChartOption<V extends string> {
  value: V;
  label: string;
}

/** Tombol bersegmen kecil untuk opsi tampilan satu chart. */
export function ChartOptionGroup<V extends string>({ label, value, options, onChange }: { label: string; value: V; options: ChartOption<V>[]; onChange: (value: V) => void }) {
  return (
    <div className="flex rounded-full bg-muted p-0.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
            value === o.value && 'bg-white text-foreground shadow-sm',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function EmptyChart() {
  return <p className="flex h-56 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Belum ada data presensi untuk filter ini.</p>;
}

/* ------------------------------------------------------------------ */
/* 1. Tren kehadiran harian (area + crosshair)                         */
/* ------------------------------------------------------------------ */

const trendConfig = { rate: { label: 'Tingkat kehadiran', color: COLOR.primary } } satisfies ChartConfig;

export function TrendChart({ points, threshold }: { points: { date: string; rate: number }[]; threshold: number }) {
  if (points.length === 0) return <EmptyChart />;
  const min = Math.max(0, Math.floor(Math.min(...points.map((p) => p.rate), threshold) / 10) * 10 - 10);

  return (
    <ChartContainer config={trendConfig} className="aspect-auto h-64 w-full">
      <AreaChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-rate)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--color-rate)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={formatDay} />
        <YAxis domain={[min, 100]} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => `${v}%`} />
        <ReferenceLine y={threshold} strokeDasharray="4 4" stroke={COLOR.late} label={{ value: `Ambang ${threshold}%`, position: 'insideBottomRight', fontSize: 11, fill: 'var(--muted-foreground)' }} />
        <ChartTooltip cursor content={<ChartTooltipContent labelFormatter={formatDay} valueFormatter={pct} />} />
        <Area dataKey="rate" type="monotone" stroke="var(--color-rate)" strokeWidth={2} fill="url(#trend-fill)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ChartContainer>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Kehadiran per mata kuliah (batang horizontal) + urutan & Top N   */
/* ------------------------------------------------------------------ */

type SortOrder = 'desc' | 'asc';
type TopN = '5' | '10' | 'all';

const rateConfig = { rate: { label: 'Tingkat kehadiran', color: COLOR.primary } } satisfies ChartConfig;

export function CourseChart({ items, threshold }: { items: { label: string; rate: number }[]; threshold: number }) {
  const [order, setOrder] = useState<SortOrder>('desc');
  const [top, setTop] = useState<TopN>('10');

  const data = useMemo(() => {
    const sorted = [...items].sort((a, b) => (order === 'desc' ? b.rate - a.rate : a.rate - b.rate));
    return top === 'all' ? sorted : sorted.slice(0, Number(top));
  }, [items, order, top]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <ChartOptionGroup label="Urutan" value={order} onChange={setOrder} options={[{ value: 'desc', label: 'Tertinggi' }, { value: 'asc', label: 'Terendah' }]} />
        <ChartOptionGroup label="Jumlah" value={top} onChange={setTop} options={[{ value: '5', label: 'Top 5' }, { value: '10', label: 'Top 10' }, { value: 'all', label: 'Semua' }]} />
      </div>
      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <ChartContainer config={rateConfig} className="aspect-auto w-full" style={{ height: Math.max(160, data.length * 40 + 24) }}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barCategoryGap={8} accessibilityLayer>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={170} tick={{ fontSize: 12 }} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent valueFormatter={pct} />} />
            <Bar dataKey="rate" radius={4}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.rate < threshold ? COLOR.late : 'var(--color-rate)'} />
              ))}
              <LabelList dataKey="rate" position="right" formatter={(v: unknown) => (typeof v === 'number' ? pct(v) : '')} className="fill-foreground text-xs font-semibold" />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Kehadiran per kelas (kolom) + urutan                             */
/* ------------------------------------------------------------------ */

type ClassSort = 'code' | 'rate';

export function ClassChart({ items, threshold }: { items: { label: string; rate: number }[]; threshold: number }) {
  const [sort, setSort] = useState<ClassSort>('code');
  const data = useMemo(() => (sort === 'code' ? items : [...items].sort((a, b) => a.rate - b.rate)), [items, sort]);

  return (
    <div className="flex flex-col gap-3">
      <ChartOptionGroup label="Urutkan kelas" value={sort} onChange={setSort} options={[{ value: 'code', label: 'Kode kelas' }, { value: 'rate', label: 'Terendah dulu' }]} />
      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <ChartContainer config={rateConfig} className="aspect-auto h-64 w-full">
          <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="4 4" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis domain={[0, 100]} hide />
            <ReferenceLine y={threshold} strokeDasharray="4 4" stroke={COLOR.late} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent valueFormatter={pct} />} />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.rate < threshold ? COLOR.late : 'var(--color-rate)'} />
              ))}
              <LabelList dataKey="rate" position="top" formatter={(v: unknown) => (typeof v === 'number' ? Math.round(v) : '')} className="fill-foreground text-xs font-semibold" />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Porsi status per bulan (kolom bertumpuk 100%) + sembunyikan seri */
/* ------------------------------------------------------------------ */

export interface MonthlyShare {
  month: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
}

type StatusKey = 'present' | 'late' | 'absent' | 'excused';

const monthlyConfig = {
  present: { label: 'Hadir', color: COLOR.present },
  late: { label: 'Terlambat', color: COLOR.late },
  absent: { label: 'Tidak hadir', color: COLOR.absent },
  excused: { label: 'Izin', color: COLOR.excused },
} satisfies ChartConfig;

const statusKeys = Object.keys(monthlyConfig) as StatusKey[];

export function MonthlyChart({ months }: { months: MonthlyShare[] }) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      // Minimal satu seri tetap tampil.
      else if (next.size < statusKeys.length - 1) next.add(key);
      return next;
    });

  if (months.length === 0) return <EmptyChart />;

  const visible = statusKeys.filter((k) => !hidden.has(k));

  return (
    <ChartContainer config={monthlyConfig} className="aspect-auto h-72 w-full">
      <BarChart data={months} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray="4 4" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatMonth} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => `${v}%`} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={formatMonth} valueFormatter={pct} />} />
        <ChartLegend content={<ChartLegendContent hiddenKeys={hidden} onToggle={toggle} />} />
        {visible.map((key, i) => (
          // Celah 1px (stroke warna kartu) memisahkan segmen; ujung atas tumpukan dibulatkan.
          <Bar key={key} dataKey={key} stackId="status" fill={`var(--color-${key})`} stroke="var(--card)" strokeWidth={1} radius={i === visible.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={64} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
