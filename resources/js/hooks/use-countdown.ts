import { useEffect, useMemo, useState } from 'react';

/**
 * Hitung mundur ke `expiresAt` memakai selisih jam server (serverNow) agar
 * jam perangkat yang salah tidak memengaruhi tampilan (NFR-10).
 */
export function useCountdown(expiresAt: string | null, serverNow: string) {
  // Selisih jam perangkat terhadap server, dihitung sekali per respons server.
  const offset = useMemo(() => new Date(serverNow).getTime() - Date.now(), [serverNow]);
  const [now, setNow] = useState(() => Date.now() + offset);

  useEffect(() => {
    setNow(Date.now() + offset);
    const id = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(id);
  }, [offset]);

  const remainingMs = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : 0;
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    remainingMs,
    isExpired: expiresAt !== null && remainingMs === 0,
    label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  };
}
