import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

import type { SharedProps } from '@/types';

/** Menampilkan pesan flash dari server (success/error/warning) sebagai toast. */
export function useFlashToast(): void {
  const { flash } = usePage<SharedProps>().props;

  useEffect(() => {
    if (flash.success) toast.success(flash.success);
    if (flash.error) toast.error(flash.error);
    if (flash.warning) toast.warning(flash.warning, { duration: 8000 });
  }, [flash.success, flash.error, flash.warning]);
}
