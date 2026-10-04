import { Link, useForm } from '@inertiajs/react';
import { ArrowRight, Lock } from 'lucide-react';
import type { FormEvent } from 'react';

import { PageHeader } from '@/components/app/page-header';
import { SelectField } from '@/components/app/select-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { Option } from '@/types';

interface PolicyBase {
  key: string;
  title: string;
  description: string;
  isLocked: boolean;
}

type Policy =
  | (PolicyBase & { kind: 'value'; value: string })
  | (PolicyBase & { kind: 'select'; value: string; options: Option[] })
  | (PolicyBase & { kind: 'switch'; value: boolean });

interface Props {
  canEdit: boolean;
  policies: Policy[];
  rooms: { ready: number; missing: string[]; inactive: number };
}

/** Item yang boleh diubah admin (sama dengan SettingController::EDITABLE). */
interface SettingsForm {
  late_after_minutes: string;
  allow_manual_attendance: boolean;
  email_session_summary: boolean;
}

function initialForm(policies: Policy[]): SettingsForm {
  const find = (key: string) => policies.find((p) => p.key === key)?.value;
  return {
    late_after_minutes: String(find('late_after_minutes') ?? '15'),
    allow_manual_attendance: find('allow_manual_attendance') === true,
    email_session_summary: find('email_session_summary') === true,
  };
}

const isFormKey = (key: string): key is keyof SettingsForm => key === 'late_after_minutes' || key === 'allow_manual_attendance' || key === 'email_session_summary';

export default function Settings({ canEdit, policies, rooms }: Props) {
  const form = useForm<SettingsForm>(initialForm(policies));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    form.put('/pengaturan', { preserveScroll: true, onSuccess: () => form.setDefaults() });
  };

  const renderControl = (p: Policy) => {
    const isDisabled = !canEdit || p.isLocked || !isFormKey(p.key);
    const labelId = `policy-${p.key}`;

    if (p.kind === 'value') {
      return <span className="rounded-xl border bg-muted/40 px-5 py-2.5 text-sm font-bold whitespace-nowrap">{p.value}</span>;
    }
    if (p.kind === 'select') {
      return (
        <SelectField
          aria-label={p.title}
          className="w-36"
          value={isDisabled ? p.value : form.data.late_after_minutes}
          options={p.options}
          isDisabled={isDisabled}
          onValueChange={(v) => form.setData('late_after_minutes', v)}
        />
      );
    }
    const checked = isFormKey(p.key) && !isDisabled ? form.data[p.key] === true : p.value;
    return (
      <Switch
        aria-labelledby={labelId}
        checked={checked}
        disabled={isDisabled}
        onCheckedChange={(v) => {
          if (p.key === 'allow_manual_attendance' || p.key === 'email_session_summary') form.setData(p.key, v);
        }}
      />
    );
  };

  return (
    <AppLayout title="Pengaturan">
      <form onSubmit={submit} className="flex flex-col gap-6">
        <PageHeader
          title="Pengaturan"
          description={canEdit ? 'Aturan yang berlaku untuk setiap sesi presensi.' : 'Aturan yang berlaku untuk setiap sesi presensi. Hanya admin yang dapat mengubah.'}
          actions={
            canEdit && (
              <Button type="submit" size="lg" disabled={!form.isDirty || form.processing}>
                {form.processing ? 'Menyimpan…' : 'Simpan perubahan'}
              </Button>
            )
          }
        />

        <div className="grid gap-4 xl:grid-cols-[1fr_380px] xl:items-start">
          <Card className="gap-0">
            <h2 className="pb-4 text-lg font-bold">Kebijakan presensi</h2>
            {policies.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-6 border-t py-5">
                <div className="flex flex-col gap-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span id={`policy-${p.key}`} className="font-bold">
                      {p.title}
                    </span>
                    {p.isLocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">
                        <Lock className="size-3" aria-hidden />
                        Kebijakan kampus
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                </div>
                <div className="shrink-0">{renderControl(p)}</div>
              </div>
            ))}
          </Card>

          <Card>
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-bold">Titik presensi ruang</h2>
              <p className="text-sm text-muted-foreground">Koordinat dan radius tiap ruang dikelola di master Ruang & Titik Presensi. Sesi QR hanya bisa dibuka di ruang yang titiknya sudah diatur.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Siap presensi', value: rooms.ready, tone: 'bg-secondary text-primary' },
                { label: 'Belum ada titik', value: rooms.missing.length, tone: 'bg-warning-soft text-warning' },
                { label: 'Nonaktif', value: rooms.inactive, tone: 'bg-muted text-foreground' },
              ].map((t) => (
                <div key={t.label} className={cn('flex flex-col gap-1 rounded-xl p-3', t.tone)}>
                  <span className="text-xs">{t.label}</span>
                  <span className="text-2xl font-extrabold">{t.value}</span>
                </div>
              ))}
            </div>
            {rooms.missing.length > 0 && (
              <p className="rounded-xl border border-amber-200 bg-warning-soft px-4 py-3 text-sm text-warning">
                {rooms.missing.join(', ')} belum punya titik. Jadwal di ruang tersebut tidak bisa dibuka sesinya.
              </p>
            )}
            {canEdit && (
              <Button asChild variant="outline" className="border-primary text-primary">
                <Link href="/admin/ruang">
                  Kelola Ruang & Titik Presensi
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
          </Card>
        </div>
      </form>
    </AppLayout>
  );
}
