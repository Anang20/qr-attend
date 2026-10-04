<?php

namespace App\Http\Controllers\Lecturer;

use App\Enums\AttendanceStatus;
use App\Enums\RequestStatus;
use App\Enums\SessionStatus;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Lecturer\Concerns\OwnsSessions;
use App\Models\AcademicPeriod;
use App\Models\Attendance;
use App\Models\Course;
use App\Models\LeaveRequest;
use App\Models\Lecturer;
use App\Services\LeaveRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Persetujuan izin/sakit oleh dosen pengampu (BR-15).
 */
class LeaveApprovalController extends Controller
{
    use OwnsSessions;

    public function index(Request $request): Response
    {
        $lecturer = $this->lecturer($request);
        $period = AcademicPeriod::active();
        $status = in_array($request->query('status'), ['pending', 'approved', 'rejected'], true) ? (string) $request->query('status') : 'pending';
        $courseId = $request->integer('course_id') ?: null;

        $base = LeaveRequest::query()->whereHas('session.classSchedule', fn ($q) => $q
            ->where('lecturer_id', $lecturer->id)
            ->where('academic_period_id', $period?->id)
            ->when($courseId, fn ($w, int $id) => $w->where('course_id', $id)));

        $counts = (clone $base)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        $requests = (clone $base)
            ->where('status', $status)
            ->with(['student.user:id,name', 'student.classGroup:id,code', 'session.classSchedule.course:id,name', 'reviewer.user:id,name'])
            ->orderBy($status === 'pending' ? 'created_at' : 'reviewed_at', $status === 'pending' ? 'asc' : 'desc')
            ->limit(50)
            ->get();

        return Inertia::render('lecturer/leave-approvals', [
            'period' => $period?->label(),
            'status' => $status,
            'courseId' => $courseId ? (string) $courseId : null,
            'counts' => [
                'pending' => (int) ($counts['pending'] ?? 0),
                'approved' => (int) ($counts['approved'] ?? 0),
                'rejected' => (int) ($counts['rejected'] ?? 0),
            ],
            'courses' => Course::query()
                ->whereHas('classSchedules', fn ($q) => $q->where('lecturer_id', $lecturer->id)->where('academic_period_id', $period?->id))
                ->orderBy('name')->get(['id', 'name'])
                ->map(fn (Course $c): array => ['value' => (string) $c->id, 'label' => $c->name]),
            'requests' => $requests->map(fn (LeaveRequest $r): array => $this->present($r)),
            'quickReasons' => ['Lampiran tidak terbaca', 'Alasan tidak termasuk izin akademik', 'Melewati batas pengajuan'],
        ]);
    }

    public function approve(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        $lecturer = $this->authorizeRequest($request, $leaveRequest);
        if ($leaveRequest->status !== RequestStatus::Pending) {
            return back()->with('error', 'Pengajuan ini sudah diproses.');
        }

        LeaveRequests::approve($leaveRequest, $lecturer);
        $leaveRequest->load('student.user:id,name');

        return back()->with('success', 'Pengajuan '.$leaveRequest->student->user->name.' disetujui. Presensi tercatat Izin.');
    }

    public function reject(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        $lecturer = $this->authorizeRequest($request, $leaveRequest);
        if ($leaveRequest->status !== RequestStatus::Pending) {
            return back()->with('error', 'Pengajuan ini sudah diproses.');
        }

        $data = $request->validate(
            ['note' => ['required', 'string', 'min:10', 'max:300']],
            ['note.required' => 'Tulis alasan penolakan.', 'note.min' => 'Alasan penolakan minimal 10 karakter.'],
        );

        LeaveRequests::reject($leaveRequest, $lecturer, $data['note']);
        $leaveRequest->load('student.user:id,name');

        return back()->with('success', 'Pengajuan '.$leaveRequest->student->user->name.' ditolak.');
    }

    private function authorizeRequest(Request $request, LeaveRequest $leaveRequest): Lecturer
    {
        $leaveRequest->load('session');

        return $this->authorizeSession($request, $leaveRequest->session);
    }

    /** @return array<string, mixed> */
    private function present(LeaveRequest $r): array
    {
        $session = $r->session;
        $schedule = $session->classSchedule;

        // Risiko: ketidakhadiran mahasiswa di mata kuliah ini pada pertemuan yang sudah terlaksana.
        $held = $schedule->sessions()->whereIn('status', [SessionStatus::Expired, SessionStatus::Closed])->pluck('id');
        $absent = Attendance::query()->where('student_id', $r->student_id)->whereIn('attendance_session_id', $held)->where('status', AttendanceStatus::Absent)->count();
        $current = Attendance::query()->where('student_id', $r->student_id)->where('attendance_session_id', $session->id)->first();

        return [
            'id' => $r->id,
            'student' => $r->student->user->name,
            'initials' => $r->student->user->initials(),
            'nim' => $r->student->nim,
            'classGroup' => $r->student->classGroup->code,
            'submittedAt' => $r->created_at?->toIso8601String(),
            'course' => $schedule->course->name,
            'meetingNo' => $session->meeting_no,
            'date' => $session->session_date->toDateString(),
            'type' => $r->type->value,
            'typeLabel' => $r->type->label(),
            'reason' => $r->reason,
            'attachmentUrl' => $r->attachment_path ? '/lampiran-izin/'.$r->id : null,
            'currentStatus' => $current?->status->label() ?? ($session->status === SessionStatus::Scheduled ? 'Belum dimulai' : 'Belum tercatat'),
            'absences' => $absent,
            'held' => $held->count(),
            'status' => $r->status->value,
            'reviewNote' => $r->review_note,
            'reviewedAt' => $r->reviewed_at?->toIso8601String(),
        ];
    }
}
