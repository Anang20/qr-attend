<?php

namespace App\Http\Controllers\Student;

use App\Enums\LeaveType;
use App\Enums\RequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Student\LeaveRequestStoreRequest;
use App\Models\AcademicPeriod;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\LeaveRequest;
use App\Services\LeaveRequests;
use App\Services\Settings;
use App\Support\Days;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pengajuan izin/sakit mahasiswa: satu kali kirim bisa untuk beberapa pertemuan,
 * tersimpan satu baris per pertemuan (batch_id sama) dan dikirim ke dosen pengampunya.
 */
class LeaveRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $student = $request->user()->student()->with('classGroup:id,code')->firstOrFail();
        $period = AcademicPeriod::active();
        $today = CarbonImmutable::today();
        $before = Settings::int('leave_window_before_days');
        $after = Settings::int('leave_window_after_days');

        // Pertemuan yang ditampilkan: sedikit di luar jendela supaya alasan "Lewat batas" terlihat.
        $sessions = AttendanceSession::query()
            ->with(['classSchedule.course:id,name', 'classSchedule.lecturer.user:id,name'])
            ->whereHas('classSchedule', fn ($q) => $q->where('class_group_id', $student->class_group_id)->where('academic_period_id', $period?->id))
            ->whereBetween('session_date', [$today->subDays($after + 5)->toDateString(), $today->addDays($before)->toDateString()])
            ->get()
            ->sortBy(fn (AttendanceSession $s) => $s->session_date->toDateString().' '.$s->classSchedule->start_time)
            ->values();

        $attendances = Attendance::query()->where('student_id', $student->id)->whereIn('attendance_session_id', $sessions->pluck('id'))->get()->keyBy('attendance_session_id');
        $active = LeaveRequests::activeRequests($student, $sessions->pluck('id')->all());

        $requests = LeaveRequest::query()
            ->with(['session.classSchedule.course:id,name', 'session.classSchedule.lecturer.user:id,name', 'reviewer.user:id,name'])
            ->where('student_id', $student->id)
            ->latest()
            ->limit(30)
            ->get();

        return Inertia::render('student/leave-requests', [
            'classGroup' => $student->classGroup->code,
            'period' => $period?->label(),
            'policy' => ['before' => $before, 'after' => $after],
            'types' => LeaveType::options(),
            'meetings' => $sessions->map(fn (AttendanceSession $s): array => [
                'id' => $s->id,
                'date' => $s->session_date->toDateString(),
                'day' => Days::name($s->classSchedule->day_of_week),
                'time' => Days::time((string) $s->classSchedule->start_time),
                'course' => $s->classSchedule->course->name,
                'lecturer' => $s->classSchedule->lecturer->user->name,
                'meetingNo' => $s->meeting_no,
                'lock' => LeaveRequests::lockReason($s, $attendances, $active, $today),
            ]),
            'requests' => $requests->map(fn (LeaveRequest $r): array => [
                'id' => $r->id,
                'course' => $r->session->classSchedule->course->name,
                'meetingNo' => $r->session->meeting_no,
                'date' => $r->session->session_date->toDateString(),
                'type' => $r->type->value,
                'typeLabel' => $r->type->label(),
                'reason' => $r->reason,
                'hasAttachment' => $r->attachment_path !== null,
                'status' => $r->status->value,
                'statusLabel' => $r->status->label(),
                'reviewNote' => $r->review_note,
                'reviewer' => $r->reviewer?->user->name,
                'reviewedAt' => $r->reviewed_at?->toIso8601String(),
                'submittedAt' => $r->created_at?->toIso8601String(),
                'lecturer' => $r->session->classSchedule->lecturer->user->name,
            ]),
        ]);
    }

    public function store(LeaveRequestStoreRequest $request): RedirectResponse
    {
        $student = $request->user()->student()->firstOrFail();
        $data = $request->validated();
        $sessionIds = array_map('intval', $data['session_ids']);
        $sessions = LeaveRequests::validateSessions($student, $sessionIds);

        $path = $request->file('attachment')?->store('leave-attachments/'.$student->id, 'local');
        $batch = (string) Str::uuid();

        DB::transaction(function () use ($sessions, $student, $data, $path, $batch): void {
            foreach ($sessions as $session) {
                LeaveRequest::query()->create([
                    'batch_id' => $batch,
                    'student_id' => $student->id,
                    'attendance_session_id' => $session->id,
                    'type' => $data['type'],
                    'reason' => $data['reason'],
                    'attachment_path' => $path,
                    'status' => RequestStatus::Pending,
                ]);
            }
        });

        return back()->with('success', $sessions->count().' pengajuan terkirim ke dosen pengampu.');
    }

    public function cancel(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        $student = $request->user()->student()->firstOrFail();
        abort_unless((int) $leaveRequest->student_id === (int) $student->id, 404);

        if ($leaveRequest->status !== RequestStatus::Pending) {
            return back()->with('error', 'Hanya pengajuan yang masih Menunggu yang bisa dibatalkan.');
        }

        $leaveRequest->update(['status' => RequestStatus::Cancelled]);

        return back()->with('success', 'Pengajuan dibatalkan.');
    }
}
