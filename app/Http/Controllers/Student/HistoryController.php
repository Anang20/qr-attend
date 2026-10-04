<?php

namespace App\Http\Controllers\Student;

use App\Enums\AttendanceStatus;
use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
use App\Models\Attendance;
use App\Models\Course;
use App\Services\AttendanceRecap;
use App\Support\Days;
use App\Support\SessionPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Support\PerPage;

/** Riwayat & detail presensi mahasiswa (periode aktif). */
class HistoryController extends Controller
{
    public function index(Request $request): Response
    {
        $student = $request->user()->student()->firstOrFail();
        $period = AcademicPeriod::active();
        $filters = $request->only(['course_id', 'status']);

        $base = Attendance::query()
            ->where('student_id', $student->id)
            ->whereHas('session.classSchedule', fn ($q) => $q->where('academic_period_id', $period?->id)
                ->when($filters['course_id'] ?? null, fn ($w, string $v) => $w->where('course_id', $v)));

        $counts = (clone $base)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        $records = (clone $base)
            ->when($filters['status'] ?? null, fn ($q, string $v) => $q->where('attendances.status', $v))
            ->with(['session.classSchedule.course:id,name', 'session.classSchedule.classGroup:id,code'])
            ->join('attendance_sessions', 'attendance_sessions.id', '=', 'attendances.attendance_session_id')
            ->orderByDesc('attendance_sessions.session_date')
            ->select('attendances.*')
            ->paginate(PerPage::from($request))
            ->withQueryString()
            ->through(fn (Attendance $a): array => [
                'id' => $a->id,
                'date' => $a->session->session_date->toDateString(),
                'course' => $a->session->classSchedule->course->name,
                'classGroup' => $a->session->classSchedule->classGroup->code,
                'schedule' => Days::time((string) $a->session->classSchedule->start_time).' – '.Days::time((string) $a->session->classSchedule->end_time),
                'meetingNo' => $a->session->meeting_no,
                'time' => $a->status !== AttendanceStatus::Absent ? $a->recorded_at->format('H.i') : null,
                'method' => $a->method->label(),
                'status' => $a->status->value,
            ]);

        $total = (int) $counts->sum();
        $attended = (int) (($counts['present'] ?? 0) + ($counts['late'] ?? 0) + ($counts['excused'] ?? 0));

        return Inertia::render('student/history', [
            'period' => $period?->label(),
            'records' => $records,
            'filters' => $filters,
            'tiles' => [
                'present' => (int) ($counts['present'] ?? 0),
                'late' => (int) ($counts['late'] ?? 0),
                'excused' => (int) ($counts['excused'] ?? 0),
                'absent' => (int) ($counts['absent'] ?? 0),
                'rate' => $total > 0 ? (int) round($attended / $total * 100) : null,
            ],
            'courses' => Course::query()
                ->whereHas('classSchedules', fn ($q) => $q->where('academic_period_id', $period?->id)->where('class_group_id', $student->class_group_id))
                ->orderBy('name')->get(['id', 'name'])
                ->map(fn (Course $c): array => ['value' => (string) $c->id, 'label' => $c->name]),
            'statuses' => AttendanceStatus::options(),
            'recap' => $period ? AttendanceRecap::forStudent($student, $period->id) : [],
        ]);
    }

    public function show(Request $request, Attendance $attendance): Response
    {
        $student = $request->user()->student()->firstOrFail();
        abort_unless((int) $attendance->student_id === (int) $student->id, 404);
        $attendance->load(['session.classSchedule.room', 'leaveRequest', 'logs']);
        $session = $attendance->session;

        // Linimasa: sesi dibuka → pindai → tercatat (+ perubahan manual / izin bila ada).
        $timeline = [];
        if ($session->opened_at) {
            $timeline[] = ['title' => 'Sesi dibuka oleh dosen', 'detail' => $session->opened_at->format('H.i.s').' · QR berlaku hingga '.$session->expires_at?->format('H.i.s')];
        }
        if ($attendance->distance_m !== null) {
            $timeline[] = ['title' => 'QR Code dipindai & semua validasi lolos', 'detail' => $attendance->recorded_at->format('H.i.s').' · jarak '.number_format((float) $attendance->distance_m, 1, ',', '.').' m dari titik '.$session->classSchedule->room->name];
        }
        foreach ($attendance->logs->sortBy('created_at') as $log) {
            $timeline[] = ['title' => 'Diubah menjadi '.$log->new_status->label().' ('.$log->method->label().')', 'detail' => $log->created_at?->format('d/m H.i').($log->reason ? ' · '.$log->reason : '')];
        }
        $timeline[] = ['title' => 'Tercatat '.$attendance->status->label(), 'detail' => $attendance->recorded_at->format('H.i.s').' · Metode: '.$attendance->method->label()];

        return Inertia::render('student/attendance-detail', [
            'session' => SessionPresenter::summary($session),
            'attendance' => [
                'status' => $attendance->status->value,
                'statusLabel' => $attendance->status->label(),
                'method' => $attendance->method->label(),
                'time' => $attendance->status !== AttendanceStatus::Absent ? $attendance->recorded_at->format('H.i.s') : null,
                'distance' => $attendance->distance_m,
                'radius' => $session->room_radius_m,
            ],
            'timeline' => $timeline,
        ]);
    }
}
