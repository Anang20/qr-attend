<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\AcademicPeriod;
use App\Models\ClassGroup;
use App\Models\ClassSchedule;
use App\Models\Course;
use App\Services\AttendanceRecap;
use App\Support\Paginate;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Rekap Kehadiran (BR-16). Satu halaman untuk admin (semua MK) dan dosen (MK yang diampu).
 * Pilihan berjenjang: Periode → Mata kuliah → Kelas.
 */
class RecapController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $isLecturer = $user->role === UserRole::Lecturer;
        $lecturerId = $isLecturer ? $user->lecturer()->value('id') : null;

        $periodId = $request->integer('period_id') ?: AcademicPeriod::active()?->id;
        $scope = fn (Builder $q): Builder => $q->where('academic_period_id', $periodId)
            ->when($lecturerId, fn ($w, int $id) => $w->where('lecturer_id', $id));

        $courses = Course::query()
            ->whereHas('classSchedules', $scope)
            ->orderBy('name')->get(['id', 'name']);
        $courseId = $request->integer('course_id') ?: $courses->first()?->id;

        $classes = ClassGroup::query()
            ->whereHas('classSchedules', fn ($q) => $scope($q)->where('course_id', $courseId))
            ->orderBy('code')->get(['id', 'code']);
        $classId = $request->integer('class_group_id');
        if (! $classes->contains('id', $classId)) {
            $classId = $classes->first()?->id;
        }

        $schedule = $courseId && $classId
            ? ClassSchedule::query()->with(['course:id,name,code', 'classGroup:id,code', 'lecturer.user:id,name'])
                ->where(fn ($q) => $scope($q))
                ->where('course_id', $courseId)->where('class_group_id', $classId)->first()
            : null;

        $recap = $schedule ? AttendanceRecap::forSchedule($schedule) : null;
        $search = trim((string) $request->query('q'));
        $chip = in_array($request->query('chip'), ['ineligible', 'warning', 'safe'], true) ? (string) $request->query('chip') : 'all';

        // Pencarian, saringan status, dan halaman dihitung di server; ringkasan tetap atas seluruh kelas.
        $page = $recap ? Paginate::collection(
            collect($recap['rows'])
                ->when($search !== '', fn ($c) => $c->filter(fn (array $r): bool => str_contains(mb_strtolower($r['name']), mb_strtolower($search)) || str_contains($r['nim'], $search)))
                ->when($chip !== 'all', fn ($c) => $c->filter(fn (array $r): bool => $chip === 'safe' ? in_array($r['status'], ['safe', 'eligible'], true) : $r['status'] === $chip)),
            $request,
        ) : null;
        $page?->through(fn (array $r, int $i): array => [...$r, 'no' => $page->firstItem() + $i]);

        return Inertia::render('shared/attendance-recap', [
            'role' => $user->role->value,
            'baseUrl' => $isLecturer ? '/dosen/rekap-kehadiran' : '/admin/rekap-kehadiran',
            'filters' => [
                'period_id' => $periodId ? (string) $periodId : null,
                'course_id' => $courseId ? (string) $courseId : null,
                'class_group_id' => $classId ? (string) $classId : null,
                'q' => $search,
                'chip' => $chip,
            ],
            'options' => [
                'periods' => AcademicPeriod::query()->orderByDesc('start_date')->get()
                    ->map(fn (AcademicPeriod $p): array => ['value' => (string) $p->id, 'label' => $p->label()]),
                'courses' => $courses->map(fn (Course $c): array => ['value' => (string) $c->id, 'label' => $c->name]),
                'classGroups' => $classes->map(fn (ClassGroup $c): array => ['value' => (string) $c->id, 'label' => $c->code]),
            ],
            'schedule' => $schedule ? [
                'course' => $schedule->course->name,
                'courseCode' => $schedule->course->code,
                'classGroup' => $schedule->classGroup->code,
                'lecturer' => $schedule->lecturer->user->name,
            ] : null,
            'recap' => $recap ? ['summary' => $recap['summary'], 'rows' => $page] : null,
            // Seluruh baris hanya dimuat saat ekspor Excel/PDF diminta.
            'exportRows' => Inertia::optional(fn (): array => $recap['rows'] ?? []),
        ]);
    }
}
