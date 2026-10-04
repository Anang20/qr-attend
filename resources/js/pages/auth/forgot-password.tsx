import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Mail } from 'lucide-react';
import type { FormEvent } from 'react';

import { fieldA11y, FormField } from '@/components/app/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/layouts/auth-layout';

export default function ForgotPassword() {
  const { data, setData, post, processing, errors, wasSuccessful } = useForm({ identifier: '' });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    post('/lupa-kata-sandi', { preserveScroll: true });
  };

  return (
    <AuthLayout title="Lupa Kata Sandi">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Lupa kata sandi</h2>
          <p className="text-muted-foreground">Kami kirim tautan atur ulang ke email kampus Anda. Tautan berlaku 30 menit.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <FormField id="identifier" label="Email kampus" error={errors.identifier} hint="Mahasiswa juga bisa memakai NIM.">
            <Input
              {...fieldA11y('identifier', errors.identifier)}
              autoFocus
              value={data.identifier}
              onChange={(e) => setData('identifier', e.target.value)}
              placeholder="nama@unpam.ac.id"
            />
          </FormField>

          <Button type="submit" size="lg" disabled={processing}>
            <Mail aria-hidden />
            {processing ? 'Mengirim…' : wasSuccessful ? 'Kirim ulang tautan' : 'Kirim tautan atur ulang'}
          </Button>
        </form>

        <Link href="/masuk" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden />
          Kembali ke halaman masuk
        </Link>
      </div>
    </AuthLayout>
  );
}
