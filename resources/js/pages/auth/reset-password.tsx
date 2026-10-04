import { useForm } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import type { FormEvent } from 'react';

import { fieldA11y, FormField } from '@/components/app/form-field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/layouts/auth-layout';

interface ResetPasswordProps {
  token: string;
  email: string;
}

export default function ResetPassword({ token, email }: ResetPasswordProps) {
  const { data, setData, post, processing, errors } = useForm({
    token,
    email,
    password: '',
    password_confirmation: '',
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    post('/atur-ulang-kata-sandi', { onFinish: () => setData((d) => ({ ...d, password: '', password_confirmation: '' })) });
  };

  return (
    <AuthLayout title="Atur Ulang Kata Sandi">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Atur ulang kata sandi</h2>
          <p className="text-muted-foreground">{email}</p>
        </div>

        {errors.email && <Alert variant="destructive">{errors.email}</Alert>}

        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <FormField id="password" label="Kata sandi baru" error={errors.password} hint="Min. 8 karakter, berisi huruf besar, huruf kecil, dan angka.">
            <Input {...fieldA11y('password', errors.password)} type="password" autoComplete="new-password" autoFocus value={data.password} onChange={(e) => setData('password', e.target.value)} />
          </FormField>
          <FormField id="password_confirmation" label="Ulangi kata sandi baru">
            <Input id="password_confirmation" type="password" autoComplete="new-password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} />
          </FormField>

          <Button type="submit" size="lg" disabled={processing}>
            <KeyRound aria-hidden />
            {processing ? 'Menyimpan…' : 'Simpan kata sandi'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
