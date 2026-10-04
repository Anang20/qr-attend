<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActiveStatus;
use App\Enums\PeriodStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ClassScheduleRequest;
use App\Models\AcademicPeriod;
use App\Models\ClassGroup;
use App\Models\ClassSchedule;
use App\Models\Course;
use App\Models\Room;
use App\Models\Student;
use App\Services\ScheduleConflicts;
use App\Services\ScheduleSessions;
use App\Support\Days;
use App\Support\Options;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pemetaan Kelas: sumber tunggal jadwal (BR-19). Setiap pemetaan otomatis
 * membuat 16 pertemuan; Jadwal Akademik hanya membaca tabel ini.
 */
class ClassScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $period = $this->resolvePeriod($request->integer('period_id') ?: null);

        $classes = ClassGroup::query()
            ->where('status', ActiveStatus::Active)
            ->withCount([
                'classSchedules as schedules_count' => fn ($q) => $q->where('academic_period_id', $period?->id),
                'classSchedules as issues_count' => fn ($q) => $q->where('academic_period_id', $period?->id)
                    ->whereHas('room', fn ($r) => $r->whereNull('latitude')),
            ])
            ->orderBy('code')
            ->get(['id', 'code', 'cohort_year']);

        $selectedId = $request->integer('class_group_id') ?: $classes->first()?->id;
        $selected = $classes->firstWhere('id', $selectedId);

        $schedules = $period && $selected
            ? ClassSchedule::query()
                ->with(['course:id,code,name,credits', 'lecturer:id,user_id', 'lecturer.user:id,name', 'room:id,name,latitude,longitude,capacity'])
                ->withCount(['sessions as opened_sessions_count' => fn ($q) => $q->whereNotNull('opened_at')])
                ->where('academic_period_id', $period->id)
                ->where('class_group_id', $selected->id)
                ->orderBy('day_of_week')->orderBy('start_time')
                ->get()
                ->map(fn (ClassSchedule $s): array => [
                    'id' => $s->id,
                    'course_id' => (string) $s->course_id,
                    'course' => $s->course->name,
                    'courseCode' => $s->course->code,
                    'credits' => $s->course->credits,
                    'lecturer_id' => (string) $s->lecturer_id,
                    'lecturer' => $s->lecturer->user->name,
                    'room_id' => (string) $s->room_id,
                    'room' => $s->room->name,
                    'roomHasPoint' => $s->room->hasPoint(),
                    'day_of_week' => (string) $s->day_of_week,
                    'day' => Days::name($s->day_of_week),
                    'start_time' => substr((string) $s->start_time, 0, 5),
                    'end_time' => substr((string) $s->end_time, 0, 5),
                    'openedSessions' => $s->opened_sessions_count,
                ])
            : collect();

        // Semua slot di periode ini, untuk pemeriksaan bentrok langsung di form (server tetap memvalidasi).
        $slots = $period
            ? ClassSchedule::query()
                ->with(['course:id,name', 'classGroup:id,code'])
                ->where('academic_period_id', $period->id)
                ->get()
                ->map(fn (ClassSchedule $s): array => [
                    'id' => $s->id,
                    'class_group_id' => (string) $s->class_group_id,
                    'lecturer_id' => (string) $s->lecturer_id,
                    'room_id' => (string) $s->room_id,
                    'day_of_week' => (string) $s->day_of_week,
                    'start_time' => substr((string) $s->start_time, 0, 5),
                    'end_time' => substr((string) $s->end_time, 0, 5),
                    'label' => $s->course->name.' · '.$s->classGroup->code,
                ])
            : collect();

        return Inertia::render('admin/class-schedules/index', [
            'periods' => AcademicPeriod::query()->orderByDesc('start_date')->get()
                ->map(fn (AcademicPeriod $p): array => ['value' => (string) $p->id, 'label' => $p->label(), 'status' => $p->status->value]),
            'period' => $period ? [
                'id' => $period->id,
                'label' => $period->label(),
                'status' => $period->status->value,
                'statusLabel' => $period->status->label(),
                'isReadOnly' => $period->status === PeriodStatus::Finished,
            ] : null,
            'classes' => $classes->map(fn (ClassGroup $c): array => [
                'id' => $c->id,
                'code' => $c->code,
                'cohortYear' => $c->cohort_year,
                'schedulesCount' => $c->schedules_count,
                'issuesCount' => $c->issues_count,
            ]),
            'selectedClass' => $selected ? [
                'id' => $selected->id,
                'code' => $selected->code,
                'studentsCount' => Student::query()->where('class_group_id', $selected->id)->count(),
            ] : null,
            'schedules' => $schedules,
            'slots' => $slots,
            'copySource' => $period && $selected && $schedules->isEmpty() && $period->status !== PeriodStatus::Finished
                ? $this->copySource($period, $selected->id)
                : null,
            'options' => [
                'courses' => Course::query()->where('status', ActiveStatus::Active)->orderBy('name')->get(['id', 'code', 'name', 'credits'])
                    ->map(fn (Course $c): array => ['value' => (string) $c->id, 'label' => $c->code.' · '.$c->name, 'credits' => $c->credits]),
                'lecturers' => Options::lecturers(),
                'rooms' => Room::query()->where('status', ActiveStatus::Active)->orderBy('code')->get(['id', 'name', 'capacity', 'latitude', 'longitude'])
                    ->map(fn (Room $r): array => ['value' => (string) $r->id, 'label' => $r->name, 'capacity' => $r->capacity, 'hasPoint' => $r->hasPoint()]),
                'days' => Days::options(),
            ],
        ]);
    }

    public function store(ClassScheduleRequest $request): RedirectResponse
    {
        $schedule = DB::transaction(function () use ($request): ClassSchedule {
            $schedule = ClassSchedule::query()->create($request->validated());
            ScheduleSessions::generate($schedule);

            return $schedule;
        });

        return $this->saved($request, $schedule, 'dipetakan');
    }

    public function update(ClassScheduleRequest $request, ClassSchedule $schedule): RedirectResponse
    {
        DB::transaction(function () use ($request, $schedule): void {
            $dayChanged = (int) $schedule->day_of_week !== $request->integer('day_of_week');
            $schedule->update($request->validated());

            if ($dayChanged) {
                ScheduleSessions::reschedule($schedule);
            }
        });

        return $this->saved($request, $schedule, 'disimpan');
    }

    public function destroy(ClassSchedule $schedule): RedirectResponse
    {
        $schedule->load(['course:id,name', 'academicPeriod']);

        if ($schedule->academicPeriod->status === PeriodStatus::Finished) {
            return back()->with('error', 'Pemetaan pada periode Selesai tidak bisa dihapus.');
        }
        if ($schedule->sessions()->whereNotNull('opened_at')->exists()) {
            return back()->with('error', $schedule->course->name.' tidak bisa dilepas karena sesi presensinya sudah berjalan.');
        }

        // Pertemuan yang belum berjalan ikut terhapus (cascade).
        $schedule->delete();

        return back()->with('success', $schedule->course->name.' dilepas dari kelas.');
    }

    /** Salin pemetaan kelas dari periode sebelumnya; slot yang bentrok dilewati. */
    public function copy(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'period_id' => ['required', 'integer', 'exists:academic_periods,id'],
            'source_period_id' => ['required', 'integer', 'exists:academic_periods,id'],
            'class_group_id' => ['required', 'integer', 'exists:class_groups,id'],
        ]);

        $period = AcademicPeriod::query()->findOrFail($data['period_id']);
        if ($period->status === PeriodStatus::Finished) {
            return back()->with('error', 'Periode Selesai tidak bisa diubah.');
        }

        $source = ClassSchedule::query()
            ->where('academic_period_id', $data['source_period_id'])
            ->where('class_group_id', $data['class_group_id'])
            ->get();

        [$copied, $skipped] = DB::transaction(function () use ($source, $period): array {
            $copied = 0;
            $skipped = 0;

            foreach ($source as $old) {
                $slot = [
                    'academic_period_id' => $period->id,
                    'class_group_id' => (int) $old->class_group_id,
                    'lecturer_id' => (int) $old->lecturer_id,
                    'room_id' => (int) $old->room_id,
                    'day_of_week' => (int) $old->day_of_week,
                    'start_time' => (string) $old->start_time,
                    'end_time' => (string) $old->end_time,
                ];
                $conflicts = ScheduleConflicts::find($slot);
                $exists = ClassSchedule::query()->where('academic_period_id', $period->id)
                    ->where('class_group_id', $old->class_group_id)->where('course_id', $old->course_id)->exists();

                if ($exists || array_filter($conflicts) !== []) {
                    $skipped++;

                    continue;
                }

                $new = ClassSchedule::query()->create([...$slot, 'course_id' => $old->course_id, 'total_meetings' => $old->total_meetings]);
                ScheduleSessions::generate($new);
                $copied++;
            }

            return [$copied, $skipped];
        });

        $message = "{$copied} pemetaan disalin.";

        return back()->with('success', $skipped > 0 ? $message." {$skipped} dilewati karena bentrok." : $message);
    }

    private function resolvePeriod(?int $id): ?AcademicPeriod
    {
        if ($id !== null) {
            return AcademicPeriod::query()->find($id);
        }

        return AcademicPeriod::active() ?? AcademicPeriod::query()->orderByDesc('start_date')->first();
    }

    /** @return array{periodId: int, label: string, count: int}|null */
    private function copySource(AcademicPeriod $period, int $classId): ?array
    {
        $previous = AcademicPeriod::query()
            ->where('start_date', '<', $period->start_date)
            ->whereHas('classSchedules', fn ($q) => $q->where('class_group_id', $classId))
            ->orderByDesc('start_date')
            ->first();

        if ($previous === null) {
            return null;
        }

        return [
            'periodId' => $previous->id,
            'label' => $previous->label(),
            'count' => $previous->classSchedules()->where('class_group_id', $classId)->count(),
        ];
    }

    private function saved(ClassScheduleRequest $request, ClassSchedule $schedule, string $verb): RedirectResponse
    {
        $schedule->load('course:id,name');
        $response = back()->with('success', $schedule->course->name.' '.$verb.'.');

        $warnings = $request->warnings();
        if ($warnings !== []) {
            $response->with('warning', implode(' ', $warnings));
        }

        return $response;
    }
}
