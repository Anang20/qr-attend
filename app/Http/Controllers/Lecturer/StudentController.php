<?php

namespace App\Http\Controllers\Lecturer;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Lecturer\Concerns\OwnsSessions;
use App\Models\AcademicPeriod;
use App\Models\ClassSchedule;
use App\Models\Student;
use App\Services\AttendanceRecap;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Mahasiswa (dosen): pilih kelas dulu, lalu tampil daftar mahasiswa kelas itu
 * beserta kehadiran di mata kuliah yang diampu dosen.
 */
class StudentController extends Controller
{
    use OwnsSessions;

    public function __invoke(Request $request): Response
    {
        $lecturer = $this->lecturer($request);
        $period = AcademicPeriod::active();

        $schedules = ClassSchedule::query()
            ->with(['course:id,name,code', 'classGroup:id,code,cohort_year'])
            ->where('lecturer_id', $lecturer->id)
            ->where('academic_period_id', $period?->id)
            ->get();

        $classes = $schedules->groupBy('class_group_id')->map(fn ($items) => [
            'id' => $items->first()->class_group_id,
            'code' => $items->first()->classGroup->code,
            'cohortYear' => $items->first()->classGroup->cohort_year,
            'courses' => $items->map(fn (ClassSchedule $s): string => $s->course->name)->values(),
            'studentsCount' => Student::query()->where('class_group_id', $items->first()->class_group_id)->count(),
        ])->sortBy('code')->values();

        $selectedId = $request->integer('class_group_id') ?: null;
        $selected = $selectedId ? $classes->firstWhere('id', $selectedId) : null;

        $courses = [];
        $rows = [];
        if ($selected !== null) {
            $classSchedules = $schedules->where('class_group_id', $selectedId)->values();
            $byStudent = [];

            foreach ($classSchedules as $schedule) {
                $courses[] = ['id' => $schedule->id, 'name' => $schedule->course->name];
                foreach (AttendanceRecap::forSchedule($schedule)['rows'] as $row) {
                    $byStudent[$row['studentId']] ??= ['studentId' => $row['studentId'], 'name' => $row['name'], 'nim' => $row['nim'], 'courses' => []];
                    $byStudent[$row['studentId']]['courses'][$schedule->id] = [
                        'percent' => $row['percent'],
                        'absent' => $row['counts']['A'],
                        'status' => $row['status'],
                    ];
                }
            }

            $rows = collect($byStudent)->sortBy('nim')->values()->all();
        }

        return Inertia::render('lecturer/students', [
            'period' => $period?->label(),
            'classes' => $classes,
            'selectedClass' => $selected,
            'courses' => $courses,
            'rows' => $rows,
        ]);
    }
}
