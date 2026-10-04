const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Jarak dua koordinat dalam meter (Haversine) — sama dengan App\Services\Geo di server. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lng2 - lng1);
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeoSample {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Gabungkan beberapa sampel GPS: buang yang akurasinya > maxAccuracy,
 * lalu rata-rata berbobot 1/akurasi² (sampel paling akurat paling berpengaruh).
 */
export function combineSamples(samples: GeoSample[], maxAccuracy = 15): GeoSample | null {
  const good = samples.filter((s) => s.accuracy <= maxAccuracy);
  if (good.length === 0) return null;

  let wSum = 0;
  let lat = 0;
  let lng = 0;
  for (const s of good) {
    const w = 1 / Math.max(s.accuracy, 1) ** 2;
    wSum += w;
    lat += s.latitude * w;
    lng += s.longitude * w;
  }

  return { latitude: lat / wSum, longitude: lng / wSum, accuracy: 1 / Math.sqrt(wSum) };
}
