<?php

namespace App\Http\Controllers\Lecturer;

use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Enums\StudentStatus;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Lecturer\Concerns\OwnsSessions;
use App\Models\AcademicPeriod;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Student;
use App\Services\AttendanceSessions;
use App\Services\Settings;
use App\Support\Options;
use App\Support\SessionPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Sesi presensi dosen: daftar pertemuan, mulai presensi (QR), pantau, selesaikan.
 */
class SessionController extends Controller
{
    use OwnsSessions;

    /** Daftar pertemuan dosen pada periode aktif (Presensi / riwayat sesi). */
    public function index(Request $request): Response
    {
        $lecturer = $this->lecturer($request);
        $period = AcademicPeriod::active();
        $filters = $request->only(['class_group_id', 'when']);

        $sessions = AttendanceSession::query()
            ->whereHas('classSchedule', fn ($q) => $q->where('lecturer_id', $lecturer->id)->where('academic_period_id', $period?->id)
                ->when($filters['class_group_id'] ?? null, fn ($w, string $v) => $w->where('class_group_id', $v)))
            ->when(($filters['when'] ?? 'upcoming') === 'past',
                fn ($q) => $q->whereDate('session_date', '<', today())->orderByDesc('session_date'),
                fn ($q) => $q->whereDate('session_date', '>=', today())->orderBy('session_date'))
            ->with(['classSchedule.course', 'classSchedule.classGroup', 'classSchedule.room', 'classSchedule.lecturer.user'])
            ->withCount([
                'attendances as attended_count' => fn ($q) => $q->whereIn('status', [AttendanceStatus::Present, AttendanceStatus::Late, AttendanceStatus::Excused]),
                'attendances as records_count',
            ])
            ->paginate(12)
            ->withQueryString()
            ->through(fn (AttendanceSession $s): array => [
                ...SessionPresenter::summary($s),
                'attended' => $s->attended_count,
                'records' => $s->records_count,
            ]);

        $classIds = $lecturer->classSchedules()->where('academic_period_id', $period?->id)->pluck('class_group_id');

        return Inertia::render('lecturer/sessions/index', [
            'period' => $period?->label(),
            'sessions' => $sessions,
            'filters' => ['when' => $filters['when'] ?? 'upcoming', 'class_group_id' => $filters['class_group_id'] ?? null],
            'classOptions' => collect(Options::classGroups())->whereIn('value', $classIds->map(fn ($id) => (string) $id))->values(),
        ]);
    }

    public function show(Request $request, AttendanceSession $session): Response
    {
        $this->authorizeSession($request, $session);
        AttendanceSessions::expireIfDue($session);
        $session->load(['classSchedule.room', 'classSchedule.academicPeriod']);
        $room = $session->classSchedule->room;

        return Inertia::render('lecturer/sessions/show', [
            'session' => [
                ...SessionPresenter::summary($session),
                'openedAt' => $session->opened_at?->toIso8601String(),
                'expiresAt' => $session->expires_at?->toIso8601String(),
                'validityMinutes' => Settings::int('qr_validity_minutes'),
                'cannotOpenReason' => $session->status === SessionStatus::Scheduled ? AttendanceSessions::cannotOpenReason($session) : null,
                'allowManual' => (bool) Settings::get('allow_manual_attendance'),
                'point' => [
                    'latitude' => $session->room_latitude ?? $room->latitude,
                    'longitude' => $session->room_longitude ?? $room->longitude,
                    'radius' => $session->room_radius_m ?? $room->radius_m,
                    'accuracy' => $room->point_accuracy_m,
                    'setAt' => $room->point_set_at?->toIso8601String(),
                ],
            ],
            // QR hanya dikirim selama sesi dibuka.
            'qrPayload' => $session->status === SessionStatus::Open ? AttendanceSessions::qrPayload($session) : null,
            'live' => fn () => $this->live($session),
            'serverNow' => now()->toIso8601String(),
            'devTools' => (bool) config('attendance.dev_tools'),
        ]);
    }

    public function open(Request $request, AttendanceSession $session): RedirectResponse
    {
        $this->authorizeSession($request, $session);
        AttendanceSessions::open($session, $request->user());

        return to_route('lecturer.sessions.show', $session)->with('success', 'Sesi presensi dibuka. QR berlaku '.Settings::int('qr_validity_minutes').' menit.');
    }

    public function finish(Request $request, AttendanceSession $session): RedirectResponse
    {
        $this->authorizeSession($request, $session);
        AttendanceSessions::finish($session);

        return back()->with('success', 'Rekap pertemuan '.$session->meeting_no.' disimpan.');
    }

    /** Daftar mahasiswa + status presensi (diperbarui lewat polling 3 detik). @return array<string, mixed> */
    private function live(AttendanceSession $session): array
    {
        $students = Student::query()
            ->with('user:id,name')
            ->where('class_group_id', $session->classSchedule->class_group_id)
            ->where('status', StudentStatus::Active)
            ->orderBy('nim')
            ->get(['id', 'user_id', 'nim']);

        $records = Attendance::query()->where('attendance_session_id', $session->id)->get()->keyBy('student_id');

        $rows = $students->map(function (Student $st) use ($records): array {
            /** @var Attendance|null $a */
            $a = $records->get($st->id);

            return [
                'studentId' => $st->id,
                'nim' => $st->nim,
                'name' => $st->user->name,
                'status' => $a?->status->value,
                'statusLabel' => $a?->status->label(),
                'method' => $a?->method->label(),
                'time' => $a?->recorded_at->format('H.i.s'),
                'distance' => $a?->distance_m,
            ];
        })
            // Yang sudah presensi tampil di atas, terbaru dulu.
            ->sortBy([fn ($a, $b) => ($a['time'] === null) <=> ($b['time'] === null), fn ($a, $b) => strcmp((string) $b['time'], (string) $a['time'])])
            ->values();

        $count = fn (AttendanceStatus $s): int => $records->where('status', $s)->count();

        return [
            'rows' => $rows,
            'counts' => [
                'total' => $students->count(),
                'present' => $count(AttendanceStatus::Present),
                'late' => $count(AttendanceStatus::Late),
                'excused' => $count(AttendanceStatus::Excused),
                'absent' => $count(AttendanceStatus::Absent),
                'notYet' => $students->count() - $records->count(),
            ],
        ];
    }
}
