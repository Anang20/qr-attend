import { useCallback, useEffect, useRef, useState } from 'react';

import { combineSamples, type GeoSample } from '@/lib/geo';

const TARGET_SAMPLES = 8;
const TIMEOUT_MS = 25_000;

export type CaptureState =
  | { status: 'idle' }
  | { status: 'capturing'; collected: number; bestAccuracy: number | null }
  | { status: 'done'; result: GeoSample; used: number }
  | { status: 'error'; message: string };

function errorMessage(error: GeolocationPositionError | null): string {
  if (!window.isSecureContext) {
    return 'Browser hanya mengizinkan lokasi di HTTPS atau localhost. Aktifkan SSL di Laragon, atau isi koordinat manual.';
  }
  if (!error) return 'Perangkat ini tidak mendukung pengambilan lokasi.';
  if (error.code === error.PERMISSION_DENIED) return 'Izin lokasi ditolak. Izinkan lokasi untuk situs ini di pengaturan browser.';
  if (error.code === error.TIMEOUT) return 'Sinyal GPS lemah. Dekati jendela lalu coba lagi.';
  return 'Lokasi tidak bisa diambil. Nyalakan GPS / layanan lokasi lalu coba lagi.';
}

/**
 * Ambil titik presensi dari GPS perangkat: kumpulkan hingga 8 sampel,
 * buang yang akurasinya > 15 m, lalu gabungkan (lihat combineSamples).
 */
export function useLocationCapture() {
  const [state, setState] = useState<CaptureState>({ status: 'idle' });
  const watchId = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const samples = useRef<GeoSample[]>([]);

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    if (timer.current !== null) window.clearTimeout(timer.current);
    watchId.current = null;
    timer.current = null;
  }, []);

  const finish = useCallback(() => {
    stop();
    const result = combineSamples(samples.current);
    setState(
      result
        ? { status: 'done', result, used: samples.current.filter((s) => s.accuracy <= 15).length }
        : { status: 'error', message: 'Akurasi GPS terlalu rendah (> 15 m). Pindah ke dekat jendela lalu ukur ulang.' },
    );
  }, [stop]);

  const start = useCallback(() => {
    if (!('geolocation' in navigator) || !window.isSecureContext) {
      setState({ status: 'error', message: errorMessage(null) });
      return;
    }

    stop();
    samples.current = [];
    setState({ status: 'capturing', collected: 0, bestAccuracy: null });

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        samples.current.push({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
        const best = Math.min(...samples.current.map((s) => s.accuracy));
        setState({ status: 'capturing', collected: samples.current.length, bestAccuracy: best });
        if (samples.current.length >= TARGET_SAMPLES) finish();
      },
      (error) => {
        stop();
        setState({ status: 'error', message: errorMessage(error) });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: TIMEOUT_MS },
    );

    // Bila sampel tidak mencapai 8 dalam 25 detik, pakai yang ada.
    timer.current = window.setTimeout(finish, TIMEOUT_MS);
  }, [finish, stop]);

  const reset = useCallback(() => {
    stop();
    setState({ status: 'idle' });
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { state, start, reset };
}
