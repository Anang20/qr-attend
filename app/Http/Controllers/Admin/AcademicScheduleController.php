<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
use App\Models\ClassSchedule;
use App\Support\Days;
use App\Support\Options;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Support\PerPage;

/**
 * Jadwal Akademik: tampilan read-only dari Pemetaan Kelas (BR-19).
 */
class AcademicScheduleController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $filters = $request->only(['period_id', 'day', 'class_group_id', 'lecturer_id']);
        $periodId = $filters['period_id'] ?? (string) (AcademicPeriod::active()?->id ?? '');
        $filters['period_id'] = $periodId;

        $schedules = ClassSchedule::query()
            ->with(['academicPeriod', 'course:id,code,name', 'classGroup:id,code', 'lecturer:id,user_id', 'lecturer.user:id,name', 'room:id,name'])
            ->when($periodId, fn ($q, string $v) => $q->where('academic_period_id', $v))
            ->when($filters['day'] ?? null, fn ($q, string $v) => $q->where('day_of_week', $v))
            ->when($filters['class_group_id'] ?? null, fn ($q, string $v) => $q->where('class_group_id', $v))
            ->when($filters['lecturer_id'] ?? null, fn ($q, string $v) => $q->where('lecturer_id', $v))
            ->orderBy('day_of_week')->orderBy('start_time')
            ->paginate(PerPage::from($request))
            ->withQueryString()
            ->through(fn (ClassSchedule $s): array => [
                'id' => $s->id,
                'day' => Days::name($s->day_of_week),
                'time' => Days::time((string) $s->start_time).' – '.Days::time((string) $s->end_time),
                'course' => $s->course->name,
                'courseCode' => $s->course->code,
                'classGroup' => $s->classGroup->code,
                'lecturer' => $s->lecturer->user->name,
                'room' => $s->room->name,
                'period' => $s->academicPeriod->label(),
                'periodStatus' => $s->academicPeriod->status->value,
                'periodStatusLabel' => $s->academicPeriod->status->label(),
            ]);

        return Inertia::render('admin/academic-schedules/index', [
            'schedules' => $schedules,
            'filters' => $filters,
            'options' => [
                'periods' => AcademicPeriod::query()->orderByDesc('start_date')->get()
                    ->map(fn (AcademicPeriod $p): array => ['value' => (string) $p->id, 'label' => $p->label()]),
                'days' => Days::options(),
                'classGroups' => Options::classGroups(),
                'lecturers' => Options::lecturers(),
            ],
        ]);
    }
}
