import { Link, useForm } from '@inertiajs/react';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { type FormEvent, useMemo } from 'react';

import { fieldA11y, FormField } from '@/components/app/form-field';
import { SelectField } from '@/components/app/select-field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuthLayout from '@/layouts/auth-layout';
import type { Option } from '@/types';

type RegisterRole = 'student' | 'lecturer';

interface ClassOption extends Option {
  studyProgramId: string;
  cohortYear: string;
}

interface RegisterProps {
  studyPrograms: Option[];
  classGroups: ClassOption[];
  registered: RegisterRole | null;
}

interface RegisterForm {
  role: RegisterRole;
  name: string;
  nim: string;
  nidn: string;
  study_program_id: string;
  cohort_year: string;
  class_group_id: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  consent: boolean;
}

const steps = [
  { title: 'Isi data diri', text: 'Sesuai data di kampus.' },
  { title: 'Verifikasi', text: 'Mahasiswa & Dosen menunggu persetujuan admin sebelum bisa masuk.' },
  { title: 'Masuk & ikat perangkat', text: 'Ponsel pertama yang dipakai presensi terikat ke akun, untuk mencegah titip absen.' },
];

const thisYear = new Date().getFullYear();
const cohortOptions: Option[] = Array.from({ length: 7 }, (_, i) => String(thisYear + 1 - i)).map((y) => ({ value: y, label: y }));

export default function Register({ studyPrograms, classGroups, registered }: RegisterProps) {
  const { data, setData, post, processing, errors, reset, clearErrors } = useForm<RegisterForm>({
    role: 'student',
    name: '',
    nim: '',
    nidn: '',
    study_program_id: '',
    cohort_year: '',
    class_group_id: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    consent: false,
  });

  const isStudent = data.role === 'student';

  // Pilihan kelas mengikuti prodi & angkatan yang dipilih.
  const classOptions = useMemo(
    () => classGroups.filter((c) => c.studyProgramId === data.study_program_id && c.cohortYear === data.cohort_year),
    [classGroups, data.study_program_id, data.cohort_year],
  );

  const errorCount = Object.keys(errors).length;

  const switchRole = (role: string) => {
    clearErrors();
    setData((d) => ({ ...d, role: role as RegisterRole, consent: false }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    post('/daftar', {
      preserveScroll: true,
      onSuccess: () => reset(),
      onFinish: () => setData((d) => ({ ...d, password: '', password_confirmation: '' })),
    });
  };

  const aside = (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl leading-tight font-extrabold tracking-tight">Daftar akun QR Attend</h1>
      <ol className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold">{i + 1}</span>
            <div>
              <p className="font-bold">{s.title}</p>
              <p className="text-sm text-emerald-100/80">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );

  if (registered) {
    return (
      <AuthLayout title="Pendaftaran Terkirim" aside={aside}>
        <div className="flex flex-col items-start gap-5">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <CheckCircle2 className="size-7" />
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight">Pendaftaran dikirim</h2>
          <p className="text-muted-foreground">Akun Anda menunggu persetujuan admin. Anda akan bisa masuk setelah disetujui.</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/masuk">Ke halaman masuk</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/daftar">Daftarkan akun lain</Link>
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Daftar" aside={aside}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Daftar</h2>
          <p className="text-muted-foreground">Akun admin dibuat oleh bagian akademik.</p>
        </div>

        <Tabs value={data.role} onValueChange={switchRole}>
          <TabsList aria-label="Jenis akun">
            <TabsTrigger value="student">Mahasiswa</TabsTrigger>
            <TabsTrigger value="lecturer">Dosen</TabsTrigger>
          </TabsList>
        </Tabs>

        {errorCount > 0 && <Alert variant="destructive">Periksa lagi {errorCount} isian yang ditandai.</Alert>}

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <FormField id="name" label={isStudent ? 'Nama lengkap' : 'Nama lengkap & gelar'} error={errors.name} isRequired>
            <Input {...fieldA11y('name', errors.name)} autoComplete="name" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder={isStudent ? 'Ray Pengki' : 'Gusmayeni, S.Kom., M.Kom'} />
          </FormField>

          {isStudent ? (
            <FormField id="nim" label="NIM" error={errors.nim} isRequired>
              <Input {...fieldA11y('nim', errors.nim)} inputMode="numeric" maxLength={12} value={data.nim} onChange={(e) => setData('nim', e.target.value.replace(/\D/g, ''))} placeholder="12 digit" />
            </FormField>
          ) : (
            <FormField id="nidn" label="NIDN / NUPTK" error={errors.nidn} isRequired>
              <Input {...fieldA11y('nidn', errors.nidn)} inputMode="numeric" maxLength={10} value={data.nidn} onChange={(e) => setData('nidn', e.target.value.replace(/\D/g, ''))} placeholder="10 digit" />
            </FormField>
          )}

          <FormField id="study_program_id" label={isStudent ? 'Program studi' : 'Prodi homebase'} error={errors.study_program_id} isRequired>
            <SelectField
              {...fieldA11y('study_program_id', errors.study_program_id)}
              isInvalid={!!errors.study_program_id}
              value={data.study_program_id}
              options={studyPrograms}
              onValueChange={(v) => setData((d) => ({ ...d, study_program_id: v, class_group_id: '' }))}
            />
          </FormField>

          {isStudent && (
            <div className="grid grid-cols-2 gap-4">
              <FormField id="cohort_year" label="Angkatan" error={errors.cohort_year} isRequired>
                <SelectField
                  {...fieldA11y('cohort_year', errors.cohort_year)}
                  isInvalid={!!errors.cohort_year}
                  value={data.cohort_year}
                  options={cohortOptions}
                  onValueChange={(v) => setData((d) => ({ ...d, cohort_year: v, class_group_id: '' }))}
                />
              </FormField>
              <FormField id="class_group_id" label="Kelas" error={errors.class_group_id} isRequired>
                <SelectField
                  {...fieldA11y('class_group_id', errors.class_group_id)}
                  isInvalid={!!errors.class_group_id}
                  value={data.class_group_id}
                  options={classOptions}
                  isDisabled={classOptions.length === 0}
                  placeholder={data.cohort_year ? 'Pilih kelas' : 'Pilih angkatan dulu'}
                  onValueChange={(v) => setData('class_group_id', v)}
                />
              </FormField>
            </div>
          )}

          <FormField id="email" label="Email aktif" error={errors.email} isRequired>
            <Input
              {...fieldA11y('email', errors.email)}
              type="email"
              autoComplete="email"
              value={data.email}
              onChange={(e) => setData('email', e.target.value)}
              placeholder="nama@email.com"
            />
          </FormField>

          <FormField id="phone" label="No. HP" error={errors.phone} isRequired>
            <Input {...fieldA11y('phone', errors.phone)} type="tel" inputMode="numeric" autoComplete="tel" maxLength={13} value={data.phone} onChange={(e) => setData('phone', e.target.value.replace(/\D/g, ''))} placeholder="08xxxxxxxxxx" />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField id="password" label="Kata sandi" error={errors.password} isRequired>
              <Input {...fieldA11y('password', errors.password)} type="password" autoComplete="new-password" value={data.password} onChange={(e) => setData('password', e.target.value)} />
            </FormField>
            <FormField id="password_confirmation" label="Ulangi kata sandi" isRequired>
              <Input id="password_confirmation" type="password" autoComplete="new-password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} />
            </FormField>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">Min. 8 karakter, berisi huruf besar, huruf kecil, dan angka.</p>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={data.consent}
                onCheckedChange={(v) => setData('consent', v === true)}
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? 'consent-error' : undefined}
                className="mt-0.5"
              />
              <Label htmlFor="consent" className="leading-snug font-normal">
                {isStudent
                  ? 'Saya mengizinkan penggunaan kamera dan lokasi hanya saat memindai QR presensi.'
                  : 'Saya menyatakan data yang saya isi sudah benar.'}
              </Label>
            </div>
            {errors.consent && (
              <p id="consent-error" className="text-xs font-medium text-destructive">
                {errors.consent}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" disabled={processing}>
            <UserPlus aria-hidden />
            {processing ? 'Mengirim…' : 'Daftar'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Sudah punya akun?{' '}
          <Link href="/masuk" className="font-semibold text-primary hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
