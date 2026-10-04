import { router, usePage } from '@inertiajs/react';
import { type IDetectedBarcode, type IScannerError, Scanner, setZXingModuleOverrides } from '@yudiel/react-qr-scanner';
import { AlertTriangle, Camera, FlaskConical, LocateFixed, Smartphone } from 'lucide-react';
import { useCallback, useState } from 'react';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

import { FormField } from '@/components/app/form-field';
import { PageHeader } from '@/components/app/page-header';
import { SelectField } from '@/components/app/select-field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentLocation } from '@/hooks/use-current-location';
import AppLayout from '@/layouts/app-layout';
import type { GeoSample } from '@/lib/geo';
import { cn, formatNumber } from '@/lib/utils';
import type { Option } from '@/types';

// Pemindai cadangan (browser tanpa BarcodeDetector) memakai WASM dari server sendiri, bukan CDN.
setZXingModuleOverrides({
  locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
});

interface DevRoom extends Option {
  latitude: number;
  longitude: number;
}

interface Props {
  maxAccuracy: number;
  device: { isBound: boolean; isThisDevice: boolean; name: string | null };
  devTools: { rooms: DevRoom[] } | null;
}

const cameraErrors: Partial<Record<IScannerError['kind'], string>> = {
  'permission-denied': 'Izin kamera ditolak. Izinkan kamera untuk situs ini lalu muat ulang halaman.',
  'no-camera': 'Kamera tidak ditemukan di perangkat ini.',
  'in-use': 'Kamera sedang dipakai aplikasi lain.',
  'insecure-context': 'Kamera hanya bisa dipakai lewat HTTPS atau localhost.',
};

export default function Scan({ maxAccuracy, device, devTools }: Props) {
  const { errors } = usePage<{ errors: Record<string, string> }>().props;
  const location = useCurrentLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devPayload, setDevPayload] = useState('');
  const [devRoomId, setDevRoomId] = useState<string>('');

  const devRoom = devTools?.rooms.find((r) => r.value === devRoomId);
  const fix: GeoSample | null = devRoom ? { latitude: devRoom.latitude, longitude: devRoom.longitude, accuracy: 5 } : location.status === 'ready' ? location.fix : null;

  const submit = useCallback(
    (payload: string) => {
      if (isSubmitting || !fix) return;
      setIsSubmitting(true);
      router.post('/mahasiswa/pindai', { payload, latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracy }, { onFinish: () => setIsSubmitting(false) });
    },
    [fix, isSubmitting],
  );

  const onScan = (codes: IDetectedBarcode[]) => {
    const value = codes[0]?.rawValue;
    if (value) submit(value);
  };

  const isAccuracyOk = fix !== null && fix.accuracy <= maxAccuracy;

  return (
    <AppLayout title="Pindai QR">
      <PageHeader title="Pindai QR" description="Pindai QR Code yang ditampilkan oleh dosen Anda." />

      {Object.values(errors).length > 0 && <Alert variant="destructive">{Object.values(errors)[0]}</Alert>}

      {!device.isBound && (
        <Alert variant="warning">
          <Smartphone aria-hidden />
          <span>Perangkat ini belum terikat ke akun Anda. Keluar lalu masuk lagi dari ponsel yang akan dipakai presensi.</span>
        </Alert>
      )}
      {device.isBound && !device.isThisDevice && (
        <Alert variant="destructive">
          <Smartphone aria-hidden />
          <span>
            Akun Anda terikat ke perangkat lain ({device.name ?? 'tidak diketahui'}). Presensi dari perangkat ini akan ditolak. Minta admin mereset perangkat bila ponsel Anda berganti.
          </span>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="gap-4 overflow-hidden bg-gray-950 p-3 text-white">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black sm:aspect-video">
            {cameraError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <Camera className="size-10 text-white/60" aria-hidden />
                <p className="text-sm text-white/80">{cameraError}</p>
              </div>
            ) : (
              <Scanner
                onScan={onScan}
                onError={(e) => setCameraError(cameraErrors[e.kind] ?? 'Kamera tidak bisa dibuka.')}
                formats={['qr_code']}
                paused={isSubmitting || !fix}
                constraints={{ facingMode: 'environment' }}
                components={{ finder: true, torch: true }}
                styles={{ container: { width: '100%', height: '100%' }, video: { objectFit: 'cover' } }}
              />
            )}
            {isSubmitting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold" role="status">
                Memeriksa presensi…
              </div>
            )}
          </div>
          <p className="px-1 text-center text-sm text-white/70">
            Pastikan Anda berada di dalam kelas dan dalam radius titik presensi ruang.
          </p>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="gap-3 p-5">
            <h2 className="flex items-center gap-2 font-extrabold">
              <LocateFixed className="size-5 text-primary" aria-hidden />
              Lokasi Anda
            </h2>
            <div aria-live="polite">
              {devRoom ? (
                <p className="text-sm text-info">Memakai lokasi simulasi {devRoom.label} (alat uji).</p>
              ) : location.status === 'locating' ? (
                <p className="text-sm text-muted-foreground">Mencari lokasi… pemindai aktif setelah lokasi didapat.</p>
              ) : location.status === 'error' ? (
                <Alert variant="destructive">{location.message}</Alert>
              ) : (
                <div className="flex flex-col gap-1 text-sm">
                  <p className={cn('font-semibold', isAccuracyOk ? 'text-success' : 'text-warning')}>
                    Akurasi ±{formatNumber(location.fix.accuracy, 0)} m {isAccuracyOk ? '· siap' : `· batas ${maxAccuracy} m`}
                  </p>
                  {!isAccuracyOk && (
                    <p className="flex gap-2 text-muted-foreground">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                      Nyalakan GPS / mode akurasi tinggi dan dekati jendela agar akurasi membaik.
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card className="gap-2 p-5">
            <h2 className="font-extrabold">Pemeriksaan sebelum pindai</h2>
            <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li>• Masuk dengan akun mahasiswa sendiri</li>
              <li>• Memakai ponsel yang terikat ke akun</li>
              <li>• Berada di ruang kelas sesuai jadwal</li>
              <li>• Izin kamera & lokasi aktif</li>
            </ul>
          </Card>

          {devTools && (
            <Card className="gap-3 border-dashed border-info p-5">
              <h2 className="flex items-center gap-2 font-extrabold text-info">
                <FlaskConical className="size-5" aria-hidden />
                Alat uji (APP_DEBUG)
              </h2>
              <FormField id="dev-room" label="Lokasi simulasi">
                <SelectField id="dev-room" value={devRoomId || undefined} options={devTools.rooms} placeholder="Pakai GPS asli" onValueChange={setDevRoomId} />
              </FormField>
              <FormField id="dev-payload" label="Isi QR (tempel dari layar dosen)">
                <Textarea id="dev-payload" value={devPayload} onChange={(e) => setDevPayload(e.target.value)} placeholder="QRATTEND:12:…" rows={3} />
              </FormField>
              <Button variant="outline" onClick={() => submit(devPayload)} disabled={!devPayload || !fix || isSubmitting}>
                Kirim isi QR
              </Button>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
