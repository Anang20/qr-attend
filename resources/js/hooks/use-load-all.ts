import { router } from '@inertiajs/react';
import { useCallback, useState } from 'react';

/**
 * Memuat seluruh baris (prop opsional Inertia, tidak ikut respons biasa) untuk ekspor Excel/PDF.
 * Tabel di layar tetap dipaginasi server; baris penuh hanya diminta saat tombol ekspor ditekan.
 */
export function useLoadAll<T>(propKey: string) {
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(
    () =>
      new Promise<T[]>((resolve) => {
        setIsLoading(true);
        router.reload({
          only: [propKey],
          onSuccess: (page) => resolve((page.props[propKey] as T[] | undefined) ?? []),
          onError: () => resolve([]),
          onFinish: () => setIsLoading(false),
        });
      }),
    [propKey],
  );

  return { load, isLoading };
}
