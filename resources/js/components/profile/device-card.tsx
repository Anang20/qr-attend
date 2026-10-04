import { router, useForm } from '@inertiajs/react';
import { Smartphone } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Option } from '@/types';

export interface BoundDevice {
  name: string | null;
  platform: string | null;
  boundAt: string;
  isThisDevice: boolean;
}

export interface PendingReset {
  id: number;
  reason: string;
  createdAt: string | null;
}

interface DeviceCardProps {
  device: BoundDevice | null;
  resetRequest: PendingReset | null;
  resetReasons: Option[];
}

const dateTime = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Perangkat presensi mahasiswa + permintaan reset ke admin (BR ikat perangkat). */
export function DeviceCard({ device, resetRequest, resetReasons }: DeviceCardProps) {
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const form = useForm({ reason: '' });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    form.post('/profil/reset-perangkat', {
      preserveScroll: true,
      onSuccess: () => {
        setIsRequestOpen(false);
        form.reset();
      },
    });
  };

  const deviceName = device ? [device.name, device.platform].filter(Boolean).join(' · ') || 'Perangkat tanpa nama' : null;

  return (
    <Card>
      <div>
        <h2 className="text-lg font-bold">Perangkat presensi</h2>
        <p className="text-sm text-muted-foreground">Presensi hanya bisa dilakukan dari perangkat ini, untuk mencegah titip absen.</p>
      </div>

      {device ? (
        <div className="flex items-center gap-4 rounded-xl border bg-muted/40 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary" aria-hidden>
            <Smartphone className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{deviceName}</p>
            <p className="text-xs text-muted-foreground">
              Terikat sejak {dateTime.format(new Date(device.boundAt))}
              {device.isThisDevice && ' · perangkat yang sedang Anda pakai'}
            </p>
          </div>
          <Badge variant="success">Terikat</Badge>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Belum ada perangkat terikat. Perangkat pertama yang dipakai untuk masuk akan terikat otomatis.
        </p>
      )}

      {resetRequest ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning-soft px-4 py-3">
          <p className="text-sm">
            <strong>Menunggu persetujuan admin</strong> · {resetRequest.reason}
            {resetRequest.createdAt && ` · diajukan ${dateTime.format(new Date(resetRequest.createdAt))}`}
          </p>
          <Button variant="outline" size="sm" onClick={() => setIsCancelOpen(true)}>
            Batalkan
          </Button>
        </div>
      ) : (
        device && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Ganti ponsel atau ponsel hilang?</p>
            <Button variant="outline" className="border-primary text-primary" onClick={() => setIsRequestOpen(true)}>
              Ajukan reset perangkat
            </Button>
          </div>
        )
      )}

      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent>
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <DialogHeader>
              <DialogTitle>Ajukan reset perangkat</DialogTitle>
              <DialogDescription>Setelah admin menyetujui, perangkat berikutnya yang Anda pakai untuk masuk akan terikat.</DialogDescription>
            </DialogHeader>
            <fieldset className="flex flex-col gap-2" aria-describedby={form.errors.reason ? 'reason-error' : undefined}>
              <legend className="mb-2 text-sm font-bold">Alasan</legend>
                {resetReasons.map((r) => (
                  <label
                    key={r.value}
                    className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40', form.data.reason === r.value && 'border-primary bg-secondary')}
                  >
                    <input type="radio" name="reason" value={r.value} checked={form.data.reason === r.value} onChange={() => form.setData('reason', r.value)} className="accent-primary" />
                    {r.label}
                  </label>
                ))}
              {form.errors.reason && (
                <p id="reason-error" className="text-xs font-medium text-destructive">
                  {form.errors.reason}
                </p>
              )}
            </fieldset>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRequestOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={form.processing}>
                Kirim permintaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        title="Batalkan permintaan reset?"
        description="Perangkat yang terikat sekarang tetap dipakai untuk presensi."
        confirmLabel="Batalkan permintaan"
        onConfirm={() => resetRequest && router.delete(`/profil/reset-perangkat/${resetRequest.id}`, { preserveScroll: true, onFinish: () => setIsCancelOpen(false) })}
      />
    </Card>
  );
}
