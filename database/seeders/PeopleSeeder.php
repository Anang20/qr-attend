<?php

namespace Database\Seeders;

use App\Enums\ActiveStatus;
use App\Enums\StudentStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\ClassGroup;
use App\Models\Lecturer;
use App\Models\Student;
use App\Models\StudyProgram;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/** Admin, dosen, kelas, dan mahasiswa contoh. */
class PeopleSeeder extends Seeder
{
    private string $password;

    public function run(): void
    {
        // Hash sekali saja agar seeding cepat.
        $this->password = Hash::make(DatabaseSeeder::DEFAULT_PASSWORD);
        $si = StudyProgram::query()->where('code', 'SI')->firstOrFail();

        // Admin dibuat langsung dari seeder (BR-25).
        $this->user('Niken', 'admin@unpam.ac.id', UserRole::Admin, '081234500001');

        $lecturers = [];
        $lecturerRows = [
            // nidn, nama & gelar, email, jabatan
            ['0412088501', 'Gusmayeni, S.Kom., M.Kom', 'gusmayeni@unpam.ac.id', 'Lektor'],
            ['0415078302', 'Budi Santoso, S.T., M.T.', 'budi.santoso@unpam.ac.id', 'Lektor Kepala'],
            ['0420098603', 'Ahmad Fauzi, S.Kom., M.Kom', 'ahmad.fauzi@unpam.ac.id', 'Asisten Ahli'],
            ['0402028804', 'Sari Wulandari, S.Si., M.Si.', 'sari.wulandari@unpam.ac.id', 'Lektor'],
            ['0418118405', 'Dewi Anggraini, S.Kom., M.T.I.', 'dewi.anggraini@unpam.ac.id', 'Asisten Ahli'],
            ['0409058706', 'Rudi Hartono, S.Kom., M.Kom', 'rudi.hartono@unpam.ac.id', 'Lektor'],
        ];

        foreach ($lecturerRows as $i => [$nidn, $name, $email, $position]) {
            $user = $this->user($name, $email, UserRole::Lecturer, '0812345001'.str_pad((string) ($i + 10), 2, '0', STR_PAD_LEFT));
            $lecturers[$nidn] = Lecturer::query()->create([
                'user_id' => $user->id,
                'nidn' => $nidn,
                'study_program_id' => $si->id,
                'functional_position' => $position,
                'status' => ActiveStatus::Active,
            ]);
        }

        // Contoh pendaftaran dosen yang menunggu persetujuan admin.
        $pending = $this->user('Hendra Wijaya, S.Kom., M.Kom', 'hendra.wijaya@unpam.ac.id', UserRole::Lecturer, '081234500099', UserStatus::Pending);
        Lecturer::query()->create([
            'user_id' => $pending->id,
            'nidn' => '0411129007',
            'study_program_id' => $si->id,
            'functional_position' => null,
            'status' => ActiveStatus::Active,
        ]);

        $classRows = [
            // kode, angkatan, NIDN dosen wali
            ['SI-3A', 2025, '0420098603'], ['SI-3B', 2025, '0418118405'], ['SI-3C', 2025, '0409058706'],
            ['SI-5A', 2024, '0412088501'], ['SI-5B', 2024, '0415078302'], ['SI-5C', 2024, '0402028804'], ['SI-5D', 2024, '0420098603'],
            ['SI-7A', 2023, '0415078302'], ['SI-7B', 2023, '0409058706'],
        ];

        $classes = [];
        foreach ($classRows as [$code, $cohort, $advisor]) {
            $classes[$code] = ClassGroup::query()->create([
                'code' => $code,
                'study_program_id' => $si->id,
                'cohort_year' => $cohort,
                'advisor_lecturer_id' => $lecturers[$advisor]->id,
                'capacity' => 40,
                'status' => ActiveStatus::Active,
            ]);
        }

        // SI-5A: 30 mahasiswa, termasuk Ray Pengki (NIM 221011450032).
        $si5a = [
            'Bagas Saputra', 'Citra Lestari', 'Dimas Hidayat', 'Eka Putri Wulandari', 'Fajar Nugroho',
            'Gita Maharani', 'Hendra Setiawan', 'Intan Rahayu', 'Joko Prasetyo', 'Kartika Sari',
            'Lukman Hakim', 'Maya Anggraeni', 'Nanda Pratama', 'Oktaviani Putri', 'Putra Ramadhan',
            'Qori Amalia', 'Rizky Maulana', 'Siti Nurhaliza', 'Taufik Hidayat', 'Umi Kalsum',
            'Vina Oktavia', 'Wahyu Firmansyah', 'Yusuf Maulana', 'Zahra Aulia', 'Agus Salim',
            'Bella Safitri', 'Candra Wijaya', 'Dina Mariana', 'Erlangga Putra',
        ];

        $seq = 1;
        foreach ($si5a as $name) {
            if ($seq === 32) {
                $seq++;
            }
            $this->student($name, '22101145'.str_pad((string) $seq, 4, '0', STR_PAD_LEFT), $classes['SI-5A'], $si->id, 2024);
            $seq++;
        }
        $this->student('Ray Pengki', '221011450032', $classes['SI-5A'], $si->id, 2024, 'ray.0032@student.unpam.ac.id');

        // Kelas lain: 5 mahasiswa per kelas sebagai contoh.
        $others = [
            'Adi Kurniawan', 'Bunga Lestari', 'Cahyo Nugroho', 'Desi Ratnasari', 'Eko Prasetyo',
            'Fitri Handayani', 'Galih Pratama', 'Hana Pertiwi', 'Irfan Hakim', 'Jihan Putri',
        ];
        $cohortPrefix = [2023 => '21101145', 2024 => '22101145', 2025 => '23101145'];
        $n = 101;
        foreach ($classes as $code => $class) {
            if ($code === 'SI-5A') {
                continue;
            }
            for ($i = 0; $i < 5; $i++) {
                $name = $others[($n + $i) % count($others)];
                $this->student($name, $cohortPrefix[$class->cohort_year].str_pad((string) $n, 4, '0', STR_PAD_LEFT), $class, $si->id, $class->cohort_year);
                $n++;
            }
        }
    }

    private function user(string $name, string $email, UserRole $role, ?string $phone, UserStatus $status = UserStatus::Active): User
    {
        return User::query()->forceCreate([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'password' => $this->password,
            'role' => $role,
            'status' => $status,
            'email_verified_at' => $status === UserStatus::Active ? now() : null,
        ]);
    }

    private function student(string $name, string $nim, ClassGroup $class, int $programId, int $cohort, ?string $email = null): void
    {
        $first = Str::of($name)->before(' ')->lower()->ascii()->toString();
        $email ??= $first.'.'.substr($nim, -4).'@student.unpam.ac.id';

        $user = $this->user($name, $email, UserRole::Student, null);

        Student::query()->create([
            'user_id' => $user->id,
            'nim' => $nim,
            'study_program_id' => $programId,
            'class_group_id' => $class->id,
            'cohort_year' => $cohort,
            'status' => StudentStatus::Active,
        ]);
    }
}
