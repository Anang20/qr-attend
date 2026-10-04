<?php

namespace App\Support;

use App\Models\AttendanceSession;
use App\Services\AttendanceSessions;

/**
 * Bentuk data satu pertemuan untuk frontend (dipakai halaman dosen & mahasiswa).
 */
final class SessionPresenter
{
    /** @return array<string, mixed> */
    public static function summary(AttendanceSession $session): array
    {
        $session->loadMissing(['classSchedule.course', 'classSchedule.classGroup', 'classSchedule.room', 'classSchedule.lecturer.user']);
        $schedule = $session->classSchedule;

        return [
            'id' => $session->id,
            'meetingNo' => $session->meeting_no,
            'date' => $session->session_date->toDateString(),
            'day' => Days::name($schedule->day_of_week),
            'startTime' => Days::time((string) $schedule->start_time),
            'endTime' => Days::time((string) $schedule->end_time),
            'course' => $schedule->course->name,
            'courseCode' => $schedule->course->code,
            'classGroup' => $schedule->classGroup->code,
            'room' => $schedule->room->name,
            'lecturer' => $schedule->lecturer->user->name,
            'status' => AttendanceSessions::displayStatus($session),
        ];
    }
}
