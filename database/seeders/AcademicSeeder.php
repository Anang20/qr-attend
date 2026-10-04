<?php

namespace Database\Seeders;

use App\Enums\ActiveStatus;
use App\Enums\CourseType;
use App\Enums\PeriodStatus;
use App\Enums\Semester;
use App\Models\AcademicPeriod;
use App\Models\Course;
use App\Models\StudyProgram;
use Illuminate\Database\Seeder;

/** Program studi, periode akademik, dan mata kuliah. */
class AcademicSeeder extends Seeder
{
    public function run(): void
    {
        $si = StudyProgram::query()->create([
            'code' => 'SI', 'name' => 'Sistem Informasi', 'faculty' => 'Fakultas Ilmu Komputer',
        ]);
        StudyProgram::query()->create([
            'code' => 'TI', 'name' => 'Teknik Informatika', 'faculty' => 'Fakultas Ilmu Komputer',
        ]);

        // Satu periode Aktif, rentang tanggal tidak tumpang tindih (BR-17, BR-18).
        $periods = [
            ['2026/2027', Semester::Genap, '2027-02-01', '2027-06-25', PeriodStatus::Upcoming],
            ['2026/2027', Semester::Ganjil, '2026-08-31', '2027-01-29', PeriodStatus::Active],
            ['2025/2026', Semester::Genap, '2026-02-02', '2026-06-26', PeriodStatus::Finished],
            ['2025/2026', Semester::Ganjil, '2025-09-01', '2026-01-30', PeriodStatus::Finished],
            ['2024/2025', Semester::Antara, '2025-07-07', '2025-08-22', PeriodStatus::Finished],
            ['2024/2025', Semester::Genap, '2025-02-03', '2025-06-27', PeriodStatus::Finished],
            ['2024/2025', Semester::Ganjil, '2024-09-02', '2025-01-31', PeriodStatus::Finished],
        ];

        foreach ($periods as [$year, $semester, $start, $end, $status]) {
            AcademicPeriod::query()->create([
                'academic_year' => $year,
                'semester' => $semester,
                'start_date' => $start,
                'end_date' => $end,
                'status' => $status,
            ]);
        }

        $courses = [
            ['IF-305', 'Pemrograman Web', 3, 5],
            ['SI-201', 'Sistem Basis Data', 3, 3],
            ['SI-307', 'Interaksi Manusia dan Komputer', 3, 5],
            ['SI-309', 'Manajemen Proses Bisnis', 3, 5],
            ['MA-210', 'Statistika', 2, 5],
            ['IF-311', 'Pemrograman Mobile', 3, 5],
            ['SI-401', 'Proyek Akhir', 4, 7],
            ['IF-230', 'Jaringan Komputer', 3, 3],
        ];

        foreach ($courses as [$code, $name, $credits, $semester]) {
            Course::query()->create([
                'code' => $code,
                'name' => $name,
                'credits' => $credits,
                'semester' => $semester,
                'type' => CourseType::Wajib,
                'study_program_id' => $si->id,
                'status' => ActiveStatus::Active,
            ]);
        }
    }
}
