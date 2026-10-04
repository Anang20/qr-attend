<?php

namespace App\Http\Controllers\Lecturer;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Lecturer\Concerns\OwnsSessions;
use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\AttendanceSession;
use App\Models\Student;
use App\Services\AttendanceSessions;
use App\Services\Settings;
use App\Support\SessionPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Presensi manual (BR-11): dosen mengubah status setelah konfirmasi; setiap perubahan tercatat di log.
 */
class ManualAttendanceController extends Controller
{
    use OwnsSessions;

    public function index(Request $request, AttendanceSession $session): Response
    {
        $this->authorizeSession($request, $session);
        AttendanceSessions::expireIfDue($session);

        $records = Attendance::query()->where('attendance_session_id', $session->id)->get()->keyBy('student_id');
        $students = Student::query()->with('user:id,name')
            ->where('class_group_id', $session->classSchedule->class_group_id)
            ->orderBy('nim')->get(['id', 'user_id', 'nim']);

        return Inertia::render('lecturer/sessions/manual', [
            'session' => SessionPresenter::summary($session),
            'canEdit' => $this->canEdit($session),
            'students' => $students->map(function (Student $st) use ($records): array {
                /** @var Attendance|null $a */
                $a = $records->get($st->id);

                return [
                    'studentId' => $st->id,
                    'nim' => $st->nim,
                    'name' => $st->user->name,
                    'status' => $a?->status->value,
                    'method' => $a?->method->label(),
                    'time' => $a?->recorded_at->format('H.i'),
                ];
            }),
            'statuses' => AttendanceStatus::options(),
        ]);
    }

    public function update(Request $request, AttendanceSession $session, Student $student): RedirectResponse
    {
        $this->authorizeSession($request, $session);

        if (! $this->canEdit($session)) {
            return back()->with('error', 'Presensi manual hanya bisa setelah sesi dibuka dan bila diizinkan kebijakan kampus.');
        }
        abort_unless((int) $student->class_group_id === (int) $session->classSchedule->class_group_id, 404);

        $data = $request->validate([
            'status' => ['required', Rule::enum(AttendanceStatus::class)],
            'reason' => ['nullable', 'string', 'max:300'],
        ]);
        $newStatus = AttendanceStatus::from($data['status']);

        DB::transaction(function () use ($session, $student, $newStatus, $data, $request): void {
            $attendance = Attendance::query()->lockForUpdate()
                ->where('attendance_session_id', $session->id)->where('student_id', $student->id)->first();
            $old = $attendance?->status;

            if ($old === $newStatus) {
                return;
            }

            $attendance ??= new Attendance(['attendance_session_id' => $session->id, 'student_id' => $student->id]);
            $attendance->fill([
                'status' => $newStatus,
                'method' => AttendanceMethod::Manual,
                'recorded_at' => now(),
                'recorded_by' => $request->user()->id,
            ])->save();

            AttendanceLog::query()->create([
                'attendance_id' => $attendance->id,
                'old_status' => $old,
                'new_status' => $newStatus,
                'method' => AttendanceMethod::Manual,
                'changed_by' => $request->user()->id,
                'reason' => $data['reason'] ?? null,
                'created_at' => now(),
            ]);
        });

        $student->load('user:id,name');

        return back()->with('success', $student->user->name.' dicatat '.$newStatus->label().' (manual).');
    }

    private function canEdit(AttendanceSession $session): bool
    {
        return (bool) Settings::get('allow_manual_attendance')
            && in_array($session->status, [SessionStatus::Open, SessionStatus::Expired, SessionStatus::Closed], true);
    }
}
