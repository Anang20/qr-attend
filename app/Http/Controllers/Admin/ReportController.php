<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Enums\StudentStatus;
use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ClassGroup;
use App\Models\ClassSchedule;
use App\Models\Course;
use App\Models\Lecturer;
use App\Models\Student;
use App\Support\Days;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Laporan Presensi per pertemuan (FR-RPT-03). Filter berjenjang:
 * Periode → Dosen → Mata kuliah → Kelas → Tanggal (pertemuan), plus Status.
 * Ekspor Excel/PDF dibuat di browser dari data yang sama (lihat halaman React).
 */
class ReportController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $periodId = $request->integer('period_id') ?: AcademicPeriod::active()?->id;
        $lecturerId = $request->integer('lecturer_id') ?: null;
        $status = in_array($request->query('status'), AttendanceStatus::values(), true) ? (string) $request->query('status') : null;

        $scheduleScope = fn ($q) => $q->where('academic_period_id', $periodId)
            ->when($lecturerId, fn ($w, int $id) => $w->where('lecturer_id', $id));

        $courses = Course::query()->whereHas('classSchedules', $scheduleScope)->orderBy('name')->get(['id', 'name', 'code']);
        $courseId = $request->integer('course_id');
        if (! $courses->contains('id', $courseId)) {
            $courseId = $courses->first()?->id;
        }

        $classes = ClassGroup::query()->whereHas('classSchedules', fn ($q) => $scheduleScope($q)->where('course_id', $courseId))->orderBy('code')->get(['id', 'code']);
        $classId = $request->integer('class_group_id');
        if (! $classes->contains('id', $classId)) {
            $classId = $classes->first()?->id;
        }

        $schedule = ClassSchedule::query()
            ->with(['course:id,name,code', 'classGroup:id,code', 'lecturer.user:id,name', 'academicPeriod', 'room:id,name'])
            ->where(fn ($q) => $scheduleScope($q))
            ->where('course_id', $courseId)->where('class_group_id', $classId)
            ->first();

        // Hanya pertemuan yang sudah dibuka yang punya data presensi.
        $sessions = $schedule
            ? AttendanceSession::query()->where('class_schedule_id', $schedule->id)
                ->whereIn('status', [SessionStatus::Open, SessionStatus::Expired, SessionStatus::Closed])
                ->orderByDesc('session_date')->get()
            : collect();
        $sessionId = $request->integer('session_id');
        $session = $sessions->firstWhere('id', $sessionId) ?? $sessions->first();

        $report = null;
        if ($schedule && $session) {
            $students = Student::query()->with('user:id,name')
                ->where('class_group_id', $schedule->class_group_id)->where('status', StudentStatus::Active)
                ->orderBy('nim')->get(['id', 'user_id', 'nim']);
            $records = Attendance::query()->where('attendance_session_id', $session->id)->get()->keyBy('student_id');

            $all = $students->map(function (Student $st) use ($records): array {
                /** @var Attendance|null $a */
                $a = $records->get($st->id);

                return [
                    'nim' => $st->nim,
                    'name' => $st->user->name,
                    'time' => $a && $a->status !== AttendanceStatus::Absent ? $a->recorded_at->format('H.i.s') : null,
                    'method' => $a && $a->status !== AttendanceStatus::Absent ? $a->method->label() : null,
                    'status' => $a?->status->value ?? 'absent',
                    'statusLabel' => $a?->status->label() ?? AttendanceStatus::Absent->label(),
                ];
            });

            $count = fn (string $s): int => $all->where('status', $s)->count();
            $total = $all->count();
            $attended = $count('present') + $count('late') + $count('excused');

            $report = [
                'meta' => [
                    'reference' => 'PRS-'.$session->session_date->format('Ymd').'-'.str_replace('-', '', $schedule->classGroup->code).'-'.$session->meeting_no,
                    'period' => $schedule->academicPeriod->label(),
                    'course' => $schedule->course->name,
                    'courseCode' => $schedule->course->code,
                    'classGroup' => $schedule->classGroup->code,
                    'lecturer' => $schedule->lecturer->user->name,
                    'room' => $schedule->room->name,
                    'date' => $session->session_date->toDateString(),
                    'day' => Days::name($schedule->day_of_week),
                    'time' => Days::time((string) $schedule->start_time).' – '.Days::time((string) $schedule->end_time),
                    'meetingNo' => $session->meeting_no,
                    'qrWindow' => $session->opened_at ? $session->opened_at->format('H.i').' – '.$session->expires_at?->format('H.i') : '—',
                    'generatedBy' => $request->user()->name,
                    'generatedAt' => now()->toIso8601String(),
                ],
                'tiles' => [
                    'total' => $total,
                    'present' => $count('present'),
                    'late' => $count('late'),
                    'absent' => $count('absent'),
                    'excused' => $count('excused'),
                    'rate' => $total > 0 ? (int) round($attended / $total * 100) : 0,
                ],
                'rows' => $all->when($status, fn ($c, string $s) => $c->where('status', $s))->values(),
            ];
        }

        return Inertia::render('admin/reports/index', [
            'filters' => [
                'period_id' => $periodId ? (string) $periodId : null,
                'lecturer_id' => $lecturerId ? (string) $lecturerId : null,
                'course_id' => $courseId ? (string) $courseId : null,
                'class_group_id' => $classId ? (string) $classId : null,
                'session_id' => $session ? (string) $session->id : null,
                'status' => $status,
            ],
            'options' => [
                'periods' => AcademicPeriod::query()->orderByDesc('start_date')->get()
                    ->map(fn (AcademicPeriod $p): array => ['value' => (string) $p->id, 'label' => $p->label()]),
                'lecturers' => Lecturer::query()->with('user:id,name')
                    ->whereHas('classSchedules', fn ($q) => $q->where('academic_period_id', $periodId))->get()
                    ->map(fn (Lecturer $l): array => ['value' => (string) $l->id, 'label' => $l->user->name])->sortBy('label')->values(),
                'courses' => $courses->map(fn (Course $c): array => ['value' => (string) $c->id, 'label' => $c->name]),
                'classGroups' => $classes->map(fn (ClassGroup $c): array => ['value' => (string) $c->id, 'label' => $c->code]),
                'sessions' => $sessions->map(fn (AttendanceSession $s): array => [
                    'value' => (string) $s->id,
                    'label' => $s->session_date->translatedFormat('D, j M Y').' · P'.$s->meeting_no,
                ]),
                'statuses' => AttendanceStatus::options(),
            ],
            'report' => $report,
        ]);
    }
}
