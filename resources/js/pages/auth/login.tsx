import { Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { fieldA11y, FormField } from '@/components/app/form-field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/layouts/auth-layout';

interface LoginForm {
  identifier: string;
  password: string;
}

export default function Login() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { data, setData, post, processing, errors } = useForm<LoginForm>({ identifier: '', password: '' });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    post('/masuk', { onFinish: () => setData('password', '') });
  };

  return (
    <AuthLayout title="Masuk">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Masuk</h2>
          <p className="text-muted-foreground">Gunakan NIM, NIDN, atau email kampus Anda.</p>
        </div>

        {errors.identifier && <Alert variant="destructive">{errors.identifier}</Alert>}

        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <FormField id="identifier" label="NIM, NIDN, atau email kampus" error={undefined}>
            <Input
              {...fieldA11y('identifier', errors.identifier)}
              name="identifier"
              autoComplete="username"
              autoFocus
              value={data.identifier}
              onChange={(e) => setData('identifier', e.target.value)}
              placeholder="221011450032"
            />
          </FormField>

          <FormField id="password" label="Kata sandi" error={errors.password}>
            <div className="relative">
              <Input
                {...fieldA11y('password', errors.password)}
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((v) => !v)}
                aria-label={isPasswordVisible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                {isPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </FormField>

          <Button type="submit" size="lg" disabled={processing}>
            <LogIn aria-hidden />
            {processing ? 'Memeriksa…' : 'Masuk'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Belum punya akun?{' '}
          <Link href="/daftar" className="font-semibold text-primary hover:underline">
            Daftar
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
