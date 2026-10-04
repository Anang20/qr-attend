<?php

namespace App\Services;

use App\Enums\SessionStatus;
use App\Enums\StudentStatus;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ClassSchedule;
use App\Models\Student;

/**
 * Rekap kehadiran satu mata kuliah di satu kelas + kelayakan UAS (BR-16, BRD 11.4).
 *
 * hadir efektif = Hadir + Terlambat + Izin
 * jatah absen    = total pertemuan − ⌈min% × total⌉   (16 − 12 = 4)
 * status berjalan: Aman (sisa ≥ 2) · Waspada (sisa 0–1) · Tidak memenuhi (sisa < 0)
 * status akhir   : Memenuhi (A ≤ jatah) · Tidak memenuhi
 */
final class AttendanceRecap
{
    private const CODES = [
        'present' => 'H',
        'late' => 'T',
        'excused' => 'I',
        'absent' => 'A',
    ];

    /** @return array{summary: array<string, mixed>, rows: list<array<string, mixed>>} */
    public static function forSchedule(ClassSchedule $schedule): array
    {
        $total = (int) $schedule->total_meetings;
        $minPercent = Settings::int('min_attendance_percent');
        $maxAbsent = $total - (int) ceil($minPercent * $total / 100);

        $sessions = AttendanceSession::query()->where('class_schedule_id', $schedule->id)->orderBy('meeting_no')->get(['id', 'meeting_no', 'status', 'session_date']);
        $heldIds = $sessions->filter(fn (AttendanceSession $s): bool => in_array($s->status, [SessionStatus::Expired, SessionStatus::Closed], true))->pluck('id');
        $held = $heldIds->count();
        $isFinished = $held >= $total;

        $students = Student::query()->with('user:id,name')
            ->where('class_group_id', $schedule->class_group_id)
            ->where('status', StudentStatus::Active)
            ->get(['id', 'user_id', 'nim']);

        $attendances = Attendance::query()
            ->whereIn('attendance_session_id', $sessions->pluck('id'))
            ->whereIn('student_id', $students->pluck('id'))
            ->get(['attendance_session_id', 'student_id', 'status'])
            ->groupBy('student_id');

        $rows = $students->map(function (Student $student) use ($sessions, $heldIds, $held, $attendances, $maxAbsent, $isFinished): array {
            $mine = ($attendances->get($student->id) ?? collect())->keyBy('attendance_session_id');
            $count = ['H' => 0, 'T' => 0, 'I' => 0, 'A' => 0];

            $strip = $sessions->map(function (AttendanceSession $s) use ($mine, $heldIds, &$count): array {
                /** @var Attendance|null $a */
                $a = $mine->get($s->id);
                $code = $a ? self::CODES[$a->status->value] : null;
                if ($code !== null && $heldIds->contains($s->id)) {
                    $count[$code]++;
                }

                return ['meetingNo' => $s->meeting_no, 'date' => $s->session_date->toDateString(), 'code' => $code];
            })->values()->all();

            $attended = $count['H'] + $count['T'] + $count['I'];
            $remaining = $maxAbsent - $count['A'];

            $status = match (true) {
                $isFinished => $count['A'] <= $maxAbsent ? 'eligible' : 'ineligible',
                $remaining < 0 => 'ineligible',
                $remaining <= 1 => 'warning',
                default => 'safe',
            };

            return [
                'studentId' => $student->id,
                'name' => $student->user->name,
                'nim' => $student->nim,
                'strip' => $strip,
                'counts' => $count,
                'percent' => $held > 0 ? round($attended / $held * 100) : null,
                'remaining' => $remaining,
                'status' => $status,
            ];
        });

        $risk = ['ineligible' => 0, 'warning' => 1, 'safe' => 2, 'eligible' => 2];
        $rows = $rows->sortBy([
            fn ($a, $b) => $risk[$a['status']] <=> $risk[$b['status']],
            fn ($a, $b) => $b['counts']['A'] <=> $a['counts']['A'],
            fn ($a, $b) => strcmp($a['name'], $b['name']),
        ])->values();

        $percents = $rows->pluck('percent')->filter(fn ($p) => $p !== null);

        return [
            'summary' => [
                'students' => $rows->count(),
                'held' => $held,
                'total' => $total,
                'average' => $percents->isNotEmpty() ? (int) round($percents->avg()) : null,
                'ineligible' => $rows->where('status', 'ineligible')->count(),
                'warning' => $rows->where('status', 'warning')->count(),
                'safe' => $rows->whereIn('status', ['safe', 'eligible'])->count(),
                'isFinished' => $isFinished,
                'minPercent' => Settings::int('min_attendance_percent'),
                'maxAbsent' => $maxAbsent,
            ],
            'rows' => $rows->all(),
        ];
    }

    /**
     * Ringkasan satu mahasiswa untuk semua mata kuliah di kelasnya (beranda mahasiswa).
     *
     * @return list<array{course: string, percent: ?int, absent: int, remaining: int, status: string}>
     */
    public static function forStudent(Student $student, int $periodId): array
    {
        $schedules = ClassSchedule::query()->with('course:id,name')
            ->where('academic_period_id', $periodId)
            ->where('class_group_id', $student->class_group_id)
            ->get();

        return $schedules->map(function (ClassSchedule $schedule) use ($student): array {
            $recap = self::forSchedule($schedule);
            $row = collect($recap['rows'])->firstWhere('studentId', $student->id);

            return [
                'course' => $schedule->course->name,
                'percent' => $row['percent'] ?? null,
                'absent' => $row['counts']['A'] ?? 0,
                'remaining' => $row['remaining'] ?? $recap['summary']['maxAbsent'],
                'status' => $row['status'] ?? 'safe',
            ];
        })->values()->all();
    }
}
