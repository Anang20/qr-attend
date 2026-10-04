<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Services\AttendanceSessions;
use App\Support\SessionPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Kelas Hari Ini: pertemuan hari ini untuk kelas mahasiswa + status presensinya. */
class TodayController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $student = $request->user()->student()->with('classGroup:id,code')->firstOrFail();
        $period = AcademicPeriod::active();

        $sessions = AttendanceSession::query()
            ->whereDate('session_date', today())
            ->whereHas('classSchedule', fn ($q) => $q->where('class_group_id', $student->class_group_id)->where('academic_period_id', $period?->id))
            ->with(['classSchedule.course', 'classSchedule.classGroup', 'classSchedule.room', 'classSchedule.lecturer.user'])
            ->get()
            ->each(fn (AttendanceSession $s) => AttendanceSessions::expireIfDue($s))
            ->sortBy(fn (AttendanceSession $s) => (string) $s->classSchedule->start_time)
            ->values();

        $mine = Attendance::query()->where('student_id', $student->id)
            ->whereIn('attendance_session_id', $sessions->pluck('id'))->get()->keyBy('attendance_session_id');

        return Inertia::render('student/today', [
            'classGroup' => $student->classGroup->code,
            'date' => today()->toDateString(),
            'sessions' => $sessions->map(function (AttendanceSession $s) use ($mine): array {
                /** @var Attendance|null $a */
                $a = $mine->get($s->id);

                return [
                    ...SessionPresenter::summary($s),
                    'expiresAt' => $s->expires_at?->toIso8601String(),
                    'myStatus' => $a?->status->value,
                    'myStatusLabel' => $a?->status->label(),
                    'myTime' => $a?->recorded_at->format('H.i'),
                    'attendanceId' => $a?->id,
                ];
            }),
            'serverNow' => now()->toIso8601String(),
        ]);
    }
}
