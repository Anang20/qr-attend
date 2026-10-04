<?php

namespace App\Services;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Enums\PeriodStatus;
use App\Enums\RequestStatus;
use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\AttendanceSession;
use App\Models\LeaveRequest;
use App\Models\Lecturer;
use App\Models\Student;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Aturan pengajuan izin/sakit (BR-12 s.d. BR-15).
 */
final class LeaveRequests
{
    /**
     * Alasan sebuah pertemuan tidak bisa diajukan, atau null bila bisa.
     * Kode: outside_window | attended | requested.
     *
     * @param  Collection<int, Attendance>  $attendances  presensi mahasiswa, key = attendance_session_id
     * @param  Collection<int, LeaveRequest>  $activeRequests  pengajuan aktif, key = attendance_session_id
     */
    public static function lockReason(AttendanceSession $session, Collection $attendances, Collection $activeRequests, ?CarbonImmutable $today = null): ?string
    {
        $today ??= CarbonImmutable::today();
        $date = CarbonImmutable::parse($session->session_date->toDateString());

        if ($activeRequests->has($session->id)) {
            return 'requested';
        }

        $attendance = $attendances->get($session->id);
        if ($attendance !== null && in_array($attendance->status, [AttendanceStatus::Present, AttendanceStatus::Late, AttendanceStatus::Excused], true)) {
            return 'attended';
        }

        $before = Settings::int('leave_window_before_days');
        $after = Settings::int('leave_window_after_days');
        if ($today->lt($date->subDays($before)) || $today->gt($date->addDays($after))) {
            return 'outside_window';
        }

        return null;
    }

    /**
     * Pastikan semua pertemuan yang dipilih sah untuk mahasiswa ini.
     *
     * @param  list<int>  $sessionIds
     * @return Collection<int, AttendanceSession>
     *
     * @throws ValidationException
     */
    public static function validateSessions(Student $student, array $sessionIds): Collection
    {
        $sessions = AttendanceSession::query()
            ->with('classSchedule.course:id,name', 'classSchedule.academicPeriod')
            ->whereIn('id', $sessionIds)
            ->get();

        $attendances = Attendance::query()->where('student_id', $student->id)->whereIn('attendance_session_id', $sessionIds)->get()->keyBy('attendance_session_id');
        $active = self::activeRequests($student, $sessionIds);

        $errors = [];
        foreach ($sessionIds as $id) {
            $session = $sessions->firstWhere('id', $id);
            $belongs = $session !== null
                && (int) $session->classSchedule->class_group_id === (int) $student->class_group_id
                && $session->classSchedule->academicPeriod->status === PeriodStatus::Active;

            if (! $belongs) {
                $errors[] = 'Ada pertemuan yang tidak ditemukan untuk kelas Anda.';

                continue;
            }

            $label = $session->classSchedule->course->name.' pertemuan '.$session->meeting_no;
            $errors[] = match (self::lockReason($session, $attendances, $active)) {
                'requested' => $label.' sudah diajukan.',
                'attended' => $label.' sudah tercatat hadir/izin.',
                'outside_window' => $label.' di luar batas pengajuan (H-'.Settings::int('leave_window_before_days').' s.d. H+'.Settings::int('leave_window_after_days').').',
                default => null,
            };
        }

        $errors = array_values(array_filter($errors));
        if ($errors !== []) {
            throw ValidationException::withMessages(['session_ids' => implode(' ', array_unique($errors))]);
        }

        return $sessions;
    }

    /**
     * @param  list<int>|null  $sessionIds
     * @return Collection<int, LeaveRequest> key = attendance_session_id
     */
    public static function activeRequests(Student $student, ?array $sessionIds = null): Collection
    {
        return LeaveRequest::query()
            ->where('student_id', $student->id)
            ->whereIn('status', [RequestStatus::Pending, RequestStatus::Approved])
            ->when($sessionIds !== null, fn ($q) => $q->whereIn('attendance_session_id', $sessionIds))
            ->get()
            ->keyBy('attendance_session_id');
    }

    /** BR-15: disetujui → presensi pertemuan menjadi Izin (metode Pengajuan) + log. */
    public static function approve(LeaveRequest $request, Lecturer $lecturer): void
    {
        DB::transaction(function () use ($request, $lecturer): void {
            $request->forceFill([
                'status' => RequestStatus::Approved,
                'reviewed_by' => $lecturer->id,
                'reviewed_at' => now(),
                'review_note' => null,
            ])->save();

            $attendance = Attendance::query()->lockForUpdate()
                ->where('attendance_session_id', $request->attendance_session_id)
                ->where('student_id', $request->student_id)
                ->first();
            $old = $attendance?->status;

            $attendance ??= new Attendance([
                'attendance_session_id' => $request->attendance_session_id,
                'student_id' => $request->student_id,
            ]);
            $attendance->fill([
                'status' => AttendanceStatus::Excused,
                'method' => AttendanceMethod::Leave,
                'recorded_at' => now(),
                'recorded_by' => $lecturer->user_id,
                'leave_request_id' => $request->id,
            ])->save();

            AttendanceLog::query()->create([
                'attendance_id' => $attendance->id,
                'old_status' => $old,
                'new_status' => AttendanceStatus::Excused,
                'method' => AttendanceMethod::Leave,
                'changed_by' => $lecturer->user_id,
                'reason' => 'Pengajuan '.$request->type->label().' disetujui',
                'created_at' => now(),
            ]);
        });
    }

    /** Ditolak: presensi tidak berubah, alasan wajib. */
    public static function reject(LeaveRequest $request, Lecturer $lecturer, string $note): void
    {
        $request->forceFill([
            'status' => RequestStatus::Rejected,
            'reviewed_by' => $lecturer->id,
            'reviewed_at' => now(),
            'review_note' => $note,
        ])->save();
    }
}
