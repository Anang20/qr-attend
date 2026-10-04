<?php

namespace App\Http\Controllers\Lecturer;

use App\Enums\SessionStatus;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Lecturer\Concerns\OwnsSessions;
use App\Models\AcademicPeriod;
use App\Models\ClassSchedule;
use App\Support\Days;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Jadwal mengajar mingguan dosen (read-only, dari Pemetaan Kelas). */
class ScheduleController extends Controller
{
    use OwnsSessions;

    public function __invoke(Request $request): Response
    {
        $lecturer = $this->lecturer($request);
        $period = AcademicPeriod::active();

        $schedules = ClassSchedule::query()
            ->with(['course:id,code,name,credits', 'classGroup:id,code', 'room:id,name'])
            ->withCount(['sessions as done_count' => fn ($q) => $q->whereIn('status', [SessionStatus::Expired, SessionStatus::Closed])])
            ->where('lecturer_id', $lecturer->id)
            ->where('academic_period_id', $period?->id)
            ->orderBy('day_of_week')->orderBy('start_time')
            ->get();

        return Inertia::render('lecturer/schedule', [
            'period' => $period?->label(),
            'schedules' => $schedules->map(function (ClassSchedule $s): array {
                $next = $s->sessions()->where('status', '!=', SessionStatus::Closed)
                    ->whereDate('session_date', '>=', today())->orderBy('session_date')->first();

                return [
                    'id' => $s->id,
                    'day' => Days::name($s->day_of_week),
                    'dayOfWeek' => $s->day_of_week,
                    'time' => Days::time((string) $s->start_time).' – '.Days::time((string) $s->end_time),
                    'course' => $s->course->name,
                    'courseCode' => $s->course->code,
                    'credits' => $s->course->credits,
                    'classGroup' => $s->classGroup->code,
                    'room' => $s->room->name,
                    'meetingsDone' => $s->done_count,
                    'totalMeetings' => $s->total_meetings,
                    'nextSession' => $next ? ['id' => $next->id, 'date' => $next->session_date->toDateString(), 'meetingNo' => $next->meeting_no] : null,
                ];
            }),
        ]);
    }
}
