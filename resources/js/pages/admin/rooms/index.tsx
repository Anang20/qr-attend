import { Crosshair, ExternalLink, LocateFixed, MapPin, Plus } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/app/data-table';
import { DataToolbar } from '@/components/app/data-toolbar';
import { fieldA11y, FormField } from '@/components/app/form-field';
import { FormSheet } from '@/components/app/form-sheet';
import { PageHeader } from '@/components/app/page-header';
import { RowActions } from '@/components/app/row-actions';
import { SelectField } from '@/components/app/select-field';
import { StatCard } from '@/components/app/stat-card';
import { Alert } from '@/components/ui/alert';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFilters } from '@/hooks/use-filters';
import { useLocationCapture } from '@/hooks/use-location-capture';
import { useResourceForm } from '@/hooks/use-resource-form';
import AppLayout from '@/layouts/app-layout';
import { distanceMeters } from '@/lib/geo';
import { formatDate, formatNumber } from '@/lib/utils';
import type { Filters, Option, Paginated } from '@/types';

type Readiness = 'ready' | 'missing' | 'inactive';

interface RoomRow {
  id: number;
  code: string;
  name: string;
  building_id: string;
  building: string;
  floor: string;
  capacity: string;
  latitude: number | null;
  longitude: number | null;
  radius_m: string;
  point_accuracy_m: number | null;
  pointSetAt: string | null;
  distanceFromCampus: number | null;
  usage: number;
  status: string;
  readiness: Readiness;
}

interface RoomForm {
  code: string;
  name: string;
  building_id: string;
  floor: string;
  capacity: string;
  status: string;
  latitude: string;
  longitude: string;
  radius_m: string;
  point_accuracy_m: string;
}

interface Point {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_m: number;
}

interface Props {
  rooms: Paginated<RoomRow>;
  filters: Filters;
  summary: { total: number; ready: number; missing: number; inactive: number; buildings: number };
  points: Point[];
  campus: { latitude: number; longitude: number; maxDistance: number };
  policy: { defaultRadius: number; minRadius: number; maxRadius: number };
  options: { buildings: Option[]; statuses: Option[] };
}

const URL = '/admin/ruang';

const readinessBadge: Record<Readiness, { label: string; variant: BadgeVariant }> = {
  ready: { label: 'Siap presensi', variant: 'success' },
  missing: { label: 'Belum ada titik', variant: 'warning' },
  inactive: { label: 'Nonaktif', variant: 'muted' },
};

const readinessOptions: Option[] = (Object.keys(readinessBadge) as Readiness[]).map((k) => ({ value: k, label: readinessBadge[k].label }));

const floorOptions: Option[] = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `Lantai ${i + 1}` }));

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function RoomsIndex({ rooms, filters: initialFilters, summary, points, campus, policy, options }: Props) {
  const { filters, setFilter, reset, isDirty } = useFilters(URL, initialFilters);
  const capture = useLocationCapture();

  const emptyForm: RoomForm = {
    code: '',
    name: '',
    building_id: '',
    floor: '1',
    capacity: '40',
    status: 'active',
    latitude: '',
    longitude: '',
    radius_m: String(policy.defaultRadius),
    point_accuracy_m: '',
  };

  const crud = useResourceForm<RoomRow, RoomForm>(URL, emptyForm, (r) => ({
    code: r.code,
    name: r.name,
    building_id: r.building_id,
    floor: r.floor,
    capacity: r.capacity,
    status: r.status,
    latitude: r.latitude?.toFixed(7) ?? '',
    longitude: r.longitude?.toFixed(7) ?? '',
    radius_m: r.radius_m,
    point_accuracy_m: r.point_accuracy_m?.toString() ?? '',
  }));
  const { data, setData, errors, processing } = crud.form;

  // Hasil pengukuran GPS langsung mengisi form.
  const { reset: resetCapture } = capture;
  useEffect(() => {
    if (capture.state.status === 'done') {
      const { latitude, longitude, accuracy } = capture.state.result;
      setData((d) => ({ ...d, latitude: latitude.toFixed(7), longitude: longitude.toFixed(7), point_accuracy_m: accuracy.toFixed(1) }));
    }
    // setData stabil dari Inertia; hanya bereaksi pada hasil baru.
  }, [capture.state]);

  useEffect(() => {
    if (!crud.isOpen) resetCapture();
  }, [crud.isOpen, resetCapture]);

  // Pratinjau validasi di klien (server tetap memvalidasi ulang).
  const preview = useMemo(() => {
    const lat = Number.parseFloat(data.latitude);
    const lng = Number.parseFloat(data.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    const radius = Number.parseInt(data.radius_m, 10) || policy.defaultRadius;
    const fromCampus = distanceMeters(campus.latitude, campus.longitude, lat, lng);
    const overlaps = points
      .filter((p) => p.id !== crud.editing?.id)
      .filter((p) => distanceMeters(lat, lng, p.latitude, p.longitude) < radius + p.radius_m)
      .map((p) => p.name);

    return { lat, lng, fromCampus, isTooFar: fromCampus > campus.maxDistance, overlaps };
  }, [data.latitude, data.longitude, data.radius_m, points, campus, policy.defaultRadius, crud.editing]);

  const clearPoint = () => {
    resetCapture();
    setData((d) => ({ ...d, latitude: '', longitude: '', point_accuracy_m: '' }));
  };


  const columns: DataTableColumn<RoomRow>[] = [
    {
      key: 'room',
      header: 'Ruang',
      cell: (r) => (
        <>
          <p className="font-bold">{r.code}</p>
          <p className="text-xs text-muted-foreground">{r.name}</p>
        </>
      ),
    },
    { key: 'building', header: 'Gedung · lantai', cell: (r) => `${r.building} · ${r.floor}` },
    { key: 'capacity', header: 'Kapasitas', align: 'right', className: 'tabular-nums', cell: (r) => r.capacity },
    {
      key: 'point',
      header: 'Titik presensi',
      cell: (r) =>
        r.latitude !== null && r.longitude !== null ? (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs">
              {r.latitude.toFixed(7)}, {r.longitude.toFixed(7)}
            </span>
            <span className="text-xs text-muted-foreground">
              {r.point_accuracy_m !== null && `akurasi ±${formatNumber(r.point_accuracy_m, 1)} m · `}
              {r.pointSetAt ? `diatur ${formatDate(r.pointSetAt)}` : ''}
            </span>
          </div>
        ) : (
          <span className="text-sm text-warning">Belum ada titik</span>
        ),
    },
    { key: 'radius', header: 'Radius', align: 'right', className: 'tabular-nums', cell: (r) => `${r.radius_m} m` },
    { key: 'usage', header: 'Dipakai', align: 'right', className: 'tabular-nums', cell: (r) => r.usage },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant={readinessBadge[r.readiness].variant}>{readinessBadge[r.readiness].label}</Badge>,
    },
    {
      key: 'actions',
      header: 'Aksi',
      isHeaderHidden: true,
      headClassName: 'w-32',
      cell: (r) => (
        <div className="flex items-center justify-end">
          {r.latitude !== null && r.longitude !== null && (
            <Button asChild variant="ghost" size="icon">
              <a href={mapsUrl(r.latitude, r.longitude)} target="_blank" rel="noreferrer noopener" aria-label={`Buka ${r.name} di Google Maps`}>
                <ExternalLink />
              </a>
            </Button>
          )}
          <RowActions name={r.name} onEdit={() => crud.openEdit(r)} onDelete={() => crud.setDeleting(r)} />
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Ruang & Titik Presensi">
      <PageHeader
        title="Ruang & Titik Presensi"
        description="Setiap ruang punya satu titik koordinat. Jarak mahasiswa saat memindai QR diukur dari titik ini."
        actions={
          <Button onClick={crud.openCreate}>
            <Plus aria-hidden />
            Tambah ruang
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total ruang" value={summary.total} sub={`${summary.buildings} gedung`} isHighlighted />
        <StatCard label="Siap presensi" value={summary.ready} sub="Titik diatur & aktif" />
        <StatCard label="Belum ada titik" value={summary.missing} sub="Sesi QR tidak bisa dibuka" tone={summary.missing > 0 ? 'warning' : 'default'} />
        <StatCard label="Nonaktif" value={summary.inactive} sub="Tidak bisa dipetakan" />
      </div>

      <Card className="gap-4">
        <DataToolbar search={filters.q ?? ''} onSearchChange={(v) => setFilter('q', v)} searchPlaceholder="Cari kode atau nama ruang" isDirty={isDirty} onReset={reset} total={rooms.total}>
          <SelectField aria-label="Filter gedung" className="w-40" value={filters.building_id} options={options.buildings} allLabel="Semua gedung" onValueChange={(v) => setFilter('building_id', v)} />
          <SelectField aria-label="Filter status titik" className="w-44" value={filters.readiness} options={readinessOptions} allLabel="Semua status" onValueChange={(v) => setFilter('readiness', v)} />
        </DataToolbar>

        <DataTable columns={columns} rows={rooms} getRowKey={(r) => r.id} />
      </Card>

      <FormSheet isOpen={crud.isOpen} onOpenChange={crud.setIsOpen} title={crud.isEditing ? 'Ubah ruang' : 'Tambah ruang'} onSubmit={crud.submit} isProcessing={processing} errorCount={Object.keys(errors).length}>
        <div className="grid grid-cols-2 gap-4">
          <FormField id="code" label="Kode ruang" error={errors.code} hint="Huruf kapital/angka, 2–10" isRequired>
            <Input {...fieldA11y('code', errors.code)} value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} maxLength={10} placeholder="R303" />
          </FormField>
          <FormField id="name" label="Nama ruang" error={errors.name} isRequired>
            <Input {...fieldA11y('name', errors.name)} value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Ruang 303" />
          </FormField>
          <FormField id="building_id" label="Gedung" error={errors.building_id} isRequired>
            <SelectField {...fieldA11y('building_id', errors.building_id)} isInvalid={!!errors.building_id} value={data.building_id} options={options.buildings} onValueChange={(v) => setData('building_id', v)} />
          </FormField>
          <FormField id="floor" label="Lantai" error={errors.floor} isRequired>
            <SelectField {...fieldA11y('floor', errors.floor)} isInvalid={!!errors.floor} value={data.floor} options={floorOptions} onValueChange={(v) => setData('floor', v)} />
          </FormField>
          <FormField id="capacity" label="Kapasitas (orang)" error={errors.capacity} isRequired>
            <Input {...fieldA11y('capacity', errors.capacity)} type="number" min={5} max={500} value={data.capacity} onChange={(e) => setData('capacity', e.target.value)} />
          </FormField>
          <FormField id="status" label="Status" error={errors.status} isRequired>
            <SelectField {...fieldA11y('status', errors.status)} isInvalid={!!errors.status} value={data.status} options={options.statuses} onValueChange={(v) => setData('status', v)} />
          </FormField>
        </div>

        <section aria-labelledby="point-title" className="flex flex-col gap-4 rounded-2xl border bg-muted/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id="point-title" className="flex items-center gap-2 font-extrabold">
                <MapPin className="size-4 text-primary" aria-hidden />
                Titik presensi
              </h3>
              <p className="text-xs text-muted-foreground">Berdiri di depan kelas (dekat layar QR), lalu ambil lokasi.</p>
            </div>
            {(data.latitude || data.longitude) && (
              <Button type="button" variant="ghost" size="sm" onClick={clearPoint}>
                Kosongkan
              </Button>
            )}
          </div>

          <Button type="button" variant="secondary" onClick={capture.start} disabled={capture.state.status === 'capturing'}>
            {capture.state.status === 'capturing' ? <Crosshair className="animate-pulse" aria-hidden /> : <LocateFixed aria-hidden />}
            {capture.state.status === 'capturing'
              ? `Mengukur… ${capture.state.collected}/8 sampel`
              : data.latitude
                ? 'Ukur ulang lokasi'
                : 'Ambil lokasi saat ini'}
          </Button>

          <div aria-live="polite">
            {capture.state.status === 'error' && <Alert variant="destructive">{capture.state.message}</Alert>}
            {capture.state.status === 'done' && (
              <Alert variant={capture.state.result.accuracy <= 10 ? 'success' : 'warning'}>
                Akurasi ±{formatNumber(capture.state.result.accuracy, 1)} m dari {capture.state.used} sampel.{' '}
                {capture.state.result.accuracy <= 10 ? 'Baik. Titik bisa dipakai.' : 'Kurang baik, sebaiknya ambil ulang.'}
              </Alert>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField id="latitude" label="Latitude" error={errors.latitude}>
              <Input {...fieldA11y('latitude', errors.latitude)} inputMode="decimal" value={data.latitude} onChange={(e) => setData('latitude', e.target.value)} placeholder="-6.3452100" />
            </FormField>
            <FormField id="longitude" label="Longitude" error={errors.longitude}>
              <Input {...fieldA11y('longitude', errors.longitude)} inputMode="decimal" value={data.longitude} onChange={(e) => setData('longitude', e.target.value)} placeholder="106.6917400" />
            </FormField>
          </div>

          <FormField id="radius_m" label="Radius (meter)" error={errors.radius_m} hint={`Default ${policy.defaultRadius} m. Perbesar untuk aula/lab yang luas.`} isRequired>
            <Input {...fieldA11y('radius_m', errors.radius_m)} type="number" min={policy.minRadius} max={policy.maxRadius} value={data.radius_m} onChange={(e) => setData('radius_m', e.target.value)} />
          </FormField>

          {preview ? (
            <div className="flex flex-col gap-2 text-sm">
              <p className={preview.isTooFar ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
                Titik berada {formatNumber(preview.fromCampus)} m dari pusat kampus
                {preview.isTooFar && ` (maks. ${campus.maxDistance} m). Mungkin latitude dan longitude tertukar.`}
              </p>
              {preview.overlaps.length > 0 && <Alert variant="warning">Radius beririsan dengan {preview.overlaps.join(', ')}.</Alert>}
              <a href={mapsUrl(preview.lat, preview.lng)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
                <ExternalLink className="size-4" aria-hidden />
                Periksa di Google Maps
              </a>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Kosongkan bila belum diukur. Ruang akan berstatus "Belum ada titik" dan sesi QR tidak bisa dibuka.</p>
          )}
        </section>
      </FormSheet>

      <ConfirmDialog
        isOpen={crud.deleting !== null}
        onOpenChange={(open) => !open && crud.setDeleting(null)}
        title={`Hapus ${crud.deleting?.name ?? ''}?`}
        description="Ruang yang masih dipakai di pemetaan kelas tidak bisa dihapus; ubah statusnya menjadi Nonaktif."
        onConfirm={crud.confirmDelete}
      />
    </AppLayout>
  );
}
