import { useEffect, useState } from 'react';

import type { GeoSample } from '@/lib/geo';

export type LocationState =
  | { status: 'locating' }
  | { status: 'ready'; fix: GeoSample }
  | { status: 'error'; message: string };

const FRESH_MS = 30_000;

/**
 * Pantau lokasi selama halaman Pindai QR terbuka (NFR-09: hanya saat memindai).
 * Simpan posisi paling akurat dari 30 detik terakhir.
 */
export function useCurrentLocation(isEnabled = true): LocationState {
  const [state, setState] = useState<LocationState>({ status: 'locating' });

  useEffect(() => {
    if (!isEnabled) return;

    if (!window.isSecureContext || !('geolocation' in navigator)) {
      setState({ status: 'error', message: 'Lokasi hanya bisa diambil lewat HTTPS atau localhost.' });
      return;
    }

    let best: (GeoSample & { at: number }) | null = null;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const sample = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, at: Date.now() };
        const isStale = best === null || Date.now() - best.at > FRESH_MS;
        if (isStale || sample.accuracy <= (best?.accuracy ?? Infinity)) {
          best = sample;
          setState({ status: 'ready', fix: { latitude: sample.latitude, longitude: sample.longitude, accuracy: sample.accuracy } });
        }
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Izin lokasi ditolak. Izinkan lokasi untuk situs ini, lalu muat ulang halaman.'
            : 'Lokasi belum didapat. Nyalakan GPS / layanan lokasi.';
        setState({ status: 'error', message });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [isEnabled]);

  return state;
}
