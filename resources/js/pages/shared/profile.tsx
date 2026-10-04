import { useForm } from '@inertiajs/react';
import { type FormEvent, useState } from 'react';

import { FormField, fieldA11y } from '@/components/app/form-field';
import { PageHeader } from '@/components/app/page-header';
import { type BoundDevice, DeviceCard, type PendingReset } from '@/components/profile/device-card';
import { PasswordForm } from '@/components/profile/password-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import type { Option, UserRole } from '@/types';

interface ProfileUser {
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  roleLabel: string;
  initials: string;
}

interface Props {
  user: ProfileUser;
  period: string | null;
  academic: { label: string; value: string }[];
  // Mahasiswa
  studentStatus?: string;
  device?: BoundDevice | null;
  resetRequest?: PendingReset | null;
  resetReasons?: Option[];
  // Admin & dosen
  otherSessions?: number;
}

export default function Profile({ user, period, academic, studentStatus, device = null, resetRequest = null, resetReasons = [], otherSessions = 0 }: Props) {
  const isStudent = user.role === 'student';

  return (
    <AppLayout title="Profil">
      <PageHeader title="Profil" description={isStudent ? 'Data diri, kontak, perangkat presensi, dan kata sandi.' : 'Data pribadi dan keamanan akun.'} />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr] lg:items-start">
        <IdentityCard user={user} academic={academic} badge={isStudent ? `${studentStatus ?? 'Aktif'}${period ? ` · ${period}` : ''}` : 'Aktif'} isStudent={isStudent} />

        <div className="flex flex-col gap-4">
          <ContactCard user={user} isNameEditable={!isStudent} />
          {isStudent ? (
            <>
              <DeviceCard device={device} resetRequest={resetRequest} resetReasons={resetReasons} />
              <Card>
                <PasswordForm title="Ubah kata sandi" />
              </Card>
            </>
          ) : (
            <SecurityCard otherSessions={otherSessions} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function IdentityCard({ user, academic, badge, isStudent }: { user: ProfileUser; academic: Props['academic']; badge: string; isStudent: boolean }) {
  return (
    <Card className="items-center text-center">
      <span className="flex size-24 items-center justify-center rounded-full bg-secondary text-3xl font-extrabold text-primary" aria-hidden>
        {user.initials}
      </span>
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-xl font-extrabold">{user.name}</p>
        <p className="text-sm text-muted-foreground">{user.roleLabel}</p>
        <Badge variant="success">{badge}</Badge>
      </div>
      <dl className="w-full text-left text-sm">
        {academic.map((a) => (
          <div key={a.label} className="flex justify-between gap-4 border-t py-3">
            <dt className="text-muted-foreground">{a.label}</dt>
            <dd className="text-right font-bold">{a.value}</dd>
          </div>
        ))}
      </dl>
      {isStudent && <p className="text-left text-xs text-muted-foreground">Data akademik diambil dari sistem kampus. Jika ada yang salah, hubungi bagian akademik.</p>}
    </Card>
  );
}

function ContactCard({ user, isNameEditable }: { user: ProfileUser; isNameEditable: boolean }) {
  const form = useForm({ name: user.name, phone: user.phone ?? '' });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Mahasiswa tidak mengirim nama (dikunci server, mengikuti data akademik).
    form.transform((data) => (isNameEditable ? data : { phone: data.phone }));
    form.put('/profil/kontak', { preserveScroll: true });
  };

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{isNameEditable ? 'Data pribadi' : 'Kontak'}</h2>
          <Button type="submit" disabled={!form.isDirty || form.processing}>
            {form.processing ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {isNameEditable && (
            <FormField id="name" label="Nama lengkap" error={form.errors.name} hint="Sertakan gelar bila ada." isRequired>
              <Input {...fieldA11y('name', form.errors.name)} value={form.data.name} maxLength={150} onChange={(e) => form.setData('name', e.target.value)} />
            </FormField>
          )}
          <FormField id="email" label="Email kampus" hint={isNameEditable ? 'Dikelola oleh bagian akademik.' : 'Dipakai untuk masuk dan notifikasi. Tidak bisa diubah.'}>
            <Input id="email" value={user.email} readOnly aria-readonly className="bg-muted text-muted-foreground" aria-describedby="email-hint" />
          </FormField>
          <FormField id="phone" label={isNameEditable ? 'No. HP' : 'No. HP (WhatsApp)'} error={form.errors.phone} hint="Diawali 08, 10–13 digit.">
            <Input {...fieldA11y('phone', form.errors.phone)} inputMode="numeric" placeholder="08xxxxxxxxxx" maxLength={13} value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value.replace(/\D/g, ''))} />
          </FormField>
        </div>
      </form>
    </Card>
  );
}

function SecurityCard({ otherSessions }: { otherSessions: number }) {
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const logoutForm = useForm({ password: '' });

  const submitLogout = (e: FormEvent) => {
    e.preventDefault();
    logoutForm.post('/profil/keluarkan-perangkat-lain', {
      preserveScroll: true,
      onSuccess: () => setIsLogoutOpen(false),
      onFinish: () => logoutForm.reset(),
    });
  };

  const rows = [
    {
      title: 'Kata sandi',
      detail: 'Gunakan minimal 8 karakter dengan huruf besar, huruf kecil, dan angka.',
      action: (
        <Button variant="outline" onClick={() => setIsPasswordOpen(true)}>
          Ubah kata sandi
        </Button>
      ),
    },
    {
      title: 'Perangkat yang masuk',
      detail: otherSessions > 0 ? `Perangkat ini dan ${otherSessions} sesi lain` : 'Hanya perangkat ini',
      action: (
        <Button variant="outline" className="border-red-200 text-destructive hover:bg-danger-soft hover:text-destructive" onClick={() => setIsLogoutOpen(true)} disabled={otherSessions === 0}>
          Keluarkan perangkat lain
        </Button>
      ),
    },
  ];

  return (
    <Card className="gap-0">
      <h2 className="pb-4 text-lg font-bold">Keamanan</h2>
      {rows.map((r) => (
        <div key={r.title} className="flex flex-wrap items-center justify-between gap-3 border-t py-4 last:pb-0">
          <div>
            <p className="font-bold">{r.title}</p>
            <p className="text-sm text-muted-foreground">{r.detail}</p>
          </div>
          {r.action}
        </div>
      ))}

      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ubah kata sandi</DialogTitle>
            <DialogDescription>Sesi di perangkat ini tetap masuk setelah kata sandi diganti.</DialogDescription>
          </DialogHeader>
          <PasswordForm onSuccess={() => setIsPasswordOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <DialogContent>
          <form onSubmit={submitLogout} className="flex flex-col gap-4" noValidate>
            <DialogHeader>
              <DialogTitle>Keluarkan perangkat lain?</DialogTitle>
              <DialogDescription>Semua sesi selain perangkat ini akan diakhiri. Masukkan kata sandi untuk konfirmasi.</DialogDescription>
            </DialogHeader>
            <FormField id="logout-password" label="Kata sandi" error={logoutForm.errors.password} isRequired>
              <Input {...fieldA11y('logout-password', logoutForm.errors.password)} type="password" autoComplete="current-password" value={logoutForm.data.password} onChange={(e) => logoutForm.setData('password', e.target.value)} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLogoutOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="destructive" disabled={logoutForm.processing}>
                Keluarkan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
