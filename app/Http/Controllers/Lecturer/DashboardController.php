<?php

namespace App\Http\Controllers\Lecturer;

use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Lecturer\Concerns\OwnsSessions;
use App\Models\AcademicPeriod;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Student;
use App\Services\AttendanceSessions;
use App\Support\SessionPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    use OwnsSessions;

    public function __invoke(Request $request): Response
    {
        $lecturer = $this->lecturer($request);
        $period = AcademicPeriod::active();

        $today = AttendanceSession::query()
            ->whereDate('session_date', today())
            ->whereHas('classSchedule', fn ($q) => $q->where('lecturer_id', $lecturer->id)
                ->where('academic_period_id', $period?->id))
            ->with(['classSchedule.course', 'classSchedule.classGroup', 'classSchedule.room', 'classSchedule.lecturer.user', 'classSchedule.academicPeriod'])
            ->get()
            ->each(fn (AttendanceSession $s) => AttendanceSessions::expireIfDue($s))
            ->sortBy(fn (AttendanceSession $s) => (string) $s->classSchedule->start_time)
            ->values();

        $active = $today->first(fn (AttendanceSession $s): bool => $s->status === SessionStatus::Open);

        $classIds = $period ? $lecturer->classSchedules()->where('academic_period_id', $period->id)->pluck('class_group_id')->unique() : collect();

        // Tingkat kehadiran: (Hadir + Terlambat + Izin) / semua catatan pada sesi dosen ini di periode aktif.
        $records = Attendance::query()
            ->whereHas('session.classSchedule', fn ($q) => $q->where('lecturer_id', $lecturer->id)->where('academic_period_id', $period?->id))
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $all = (int) $records->sum();
        $attended = (int) (($records[AttendanceStatus::Present->value] ?? 0) + ($records[AttendanceStatus::Late->value] ?? 0) + ($records[AttendanceStatus::Excused->value] ?? 0));

        return Inertia::render('lecturer/dashboard', [
            'period' => $period?->label(),
            'today' => $today->map(fn (AttendanceSession $s): array => [
                ...SessionPresenter::summary($s),
                'cannotOpenReason' => $s->status === SessionStatus::Scheduled ? AttendanceSessions::cannotOpenReason($s) : null,
            ]),
            'activeSession' => $active ? [
                ...SessionPresenter::summary($active),
                'expiresAt' => $active->expires_at?->toIso8601String(),
                'recorded' => $active->attendances()->count(),
                'total' => Student::query()->where('class_group_id', $active->classSchedule->class_group_id)->count(),
            ] : null,
            'stats' => [
                'classesToday' => $today->count(),
                'students' => Student::query()->whereIn('class_group_id', $classIds)->count(),
                'attendanceRate' => $all > 0 ? round($attended / $all * 100, 1) : null,
            ],
            'serverNow' => now()->toIso8601String(),
        ]);
    }
}
