<?php

namespace App\Support;

use App\Models\Building;
use App\Models\ClassGroup;
use App\Models\Lecturer;
use App\Models\StudyProgram;

/**
 * Daftar pilihan dropdown yang dipakai banyak halaman: [{ value, label }].
 * value selalu string agar cocok dengan komponen Select di frontend.
 */
final class Options
{
    /** @return list<array{value: string, label: string}> */
    public static function studyPrograms(): array
    {
        return StudyProgram::query()->orderBy('name')->get(['id', 'name'])
            ->map(fn (StudyProgram $p): array => ['value' => (string) $p->id, 'label' => $p->name])
            ->all();
    }

    /** @return list<array{value: string, label: string, studyProgramId: string, cohortYear: string}> */
    public static function classGroups(): array
    {
        return ClassGroup::query()->orderBy('code')->get(['id', 'code', 'study_program_id', 'cohort_year'])
            ->map(fn (ClassGroup $c): array => [
                'value' => (string) $c->id,
                'label' => $c->code,
                'studyProgramId' => (string) $c->study_program_id,
                'cohortYear' => (string) $c->cohort_year,
            ])
            ->all();
    }

    /** Dosen aktif untuk pilihan dosen wali. @return list<array{value: string, label: string}> */
    public static function lecturers(): array
    {
        return Lecturer::query()
            ->join('users', 'users.id', '=', 'lecturers.user_id')
            ->where('users.status', 'active')
            ->orderBy('users.name')
            ->get(['lecturers.id', 'users.name'])
            ->map(fn (Lecturer $l): array => ['value' => (string) $l->id, 'label' => (string) $l->getAttribute('name')])
            ->all();
    }

    /** @return list<array{value: string, label: string}> */
    public static function buildings(): array
    {
        return Building::query()->orderBy('code')->get(['id', 'name'])
            ->map(fn (Building $b): array => ['value' => (string) $b->id, 'label' => $b->name])
            ->all();
    }

    /** Tahun angkatan dari 6 tahun lalu s.d. tahun depan. @return list<array{value: string, label: string}> */
    public static function cohortYears(): array
    {
        $now = (int) date('Y');

        return array_map(
            fn (int $y): array => ['value' => (string) $y, 'label' => (string) $y],
            range($now + 1, $now - 6),
        );
    }
}
