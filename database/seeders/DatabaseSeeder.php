<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Data contoh sesuai desain & BRD (Universitas Pamulang).
 * Semua akun contoh memakai kata sandi: Password123
 */
class DatabaseSeeder extends Seeder
{
    public const DEFAULT_PASSWORD = 'Password123';

    public function run(): void
    {
        $this->call([
            SettingSeeder::class,
            AcademicSeeder::class,
            RoomSeeder::class,
            PeopleSeeder::class,
            ScheduleSeeder::class,
        ]);
    }
}
