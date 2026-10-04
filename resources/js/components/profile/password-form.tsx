import { useForm } from '@inertiajs/react';
import { type FormEvent, useState } from 'react';

import { FormField, fieldA11y } from '@/components/app/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PasswordFormProps {
  /** Judul kartu (dipakai saat form tampil inline). */
  title?: string;
  /** Dipanggil setelah sandi berhasil diperbarui (mis. menutup dialog). */
  onSuccess?: () => void;
  className?: string;
}

/** Form ubah kata sandi — dipakai inline (mahasiswa) dan di dialog (admin/dosen). */
export function PasswordForm({ title, onSuccess, className }: PasswordFormProps) {
  const [isVisible, setIsVisible] = useState(false);
  const form = useForm({ current_password: '', password: '', password_confirmation: '' });
  const type = isVisible ? 'text' : 'password';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    form.put('/profil/kata-sandi', {
      preserveScroll: true,
      onSuccess: () => {
        form.reset();
        onSuccess?.();
      },
      // Jangan simpan sandi yang salah di field setelah galat.
      onError: () => form.reset('current_password'),
    });
  };

  return (
    <form onSubmit={submit} className={cn('flex flex-col gap-4', className)} noValidate>
      <div className="flex items-center justify-between gap-3">
        {title ? <h2 className="text-lg font-bold">{title}</h2> : <span />}
        <button type="button" onClick={() => setIsVisible((v) => !v)} className="text-sm font-bold text-primary hover:underline" aria-pressed={isVisible}>
          {isVisible ? 'Sembunyikan' : 'Tampilkan'}
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <FormField id="current_password" label="Kata sandi saat ini" error={form.errors.current_password}>
          <Input {...fieldA11y('current_password', form.errors.current_password)} type={type} autoComplete="current-password" value={form.data.current_password} onChange={(e) => form.setData('current_password', e.target.value)} />
        </FormField>
        <FormField id="password" label="Kata sandi baru" error={form.errors.password}>
          <Input {...fieldA11y('password', form.errors.password)} type={type} autoComplete="new-password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} />
        </FormField>
        <FormField id="password_confirmation" label="Ulangi kata sandi baru" error={form.errors.password_confirmation}>
          <Input
            {...fieldA11y('password_confirmation', form.errors.password_confirmation)}
            type={type}
            autoComplete="new-password"
            value={form.data.password_confirmation}
            onChange={(e) => form.setData('password_confirmation', e.target.value)}
          />
        </FormField>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Minimal 8 karakter, campuran huruf besar, huruf kecil, dan angka.</p>
        <Button type="submit" disabled={form.processing}>
          {form.processing ? 'Menyimpan…' : 'Perbarui kata sandi'}
        </Button>
      </div>
    </form>
  );
}
