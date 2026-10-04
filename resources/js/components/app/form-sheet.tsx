import type { FormEvent, ReactNode } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface FormSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSubmit: (e: FormEvent) => void;
  isProcessing: boolean;
  errorCount: number;
  submitLabel?: string;
  children: ReactNode;
}

/** Panel samping 480px untuk form tambah/ubah. */
export function FormSheet({ isOpen, onOpenChange, title, onSubmit, isProcessing, errorCount, submitLabel = 'Simpan', children }: FormSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Kolom bertanda * wajib diisi.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
            {errorCount > 0 && <Alert variant="destructive">Periksa lagi {errorCount} isian yang ditandai.</Alert>}
            {children}
          </div>
          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? 'Menyimpan…' : submitLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
