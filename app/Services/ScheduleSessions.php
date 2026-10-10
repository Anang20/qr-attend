<?php

namespace App\Services;

use App\Enums\SessionStatus;
use App\Models\AttendanceSession;
use App\Models\ClassSchedule;
use Carbon\CarbonImmutable;

/**
 * Membuat & menyesuaikan 16 pertemuan dari satu pemetaan kelas (BRD FR-SCH-04).
 * Pertemuan dibuat di muka agar pengajuan izin H-7 punya pertemuan yang dituju.
 */
final class ScheduleSessions
{
    public static function generate(ClassSchedule $schedule): void
    {
        $dates = self::dates($schedule);

        foreach ($dates as $i => $date) {
            AttendanceSession::query()->create([
                'class_schedule_id' => $schedule->id,
                'meeting_no' => $i + 1,
                'session_date' => $date->toDateString(),
                'status' => SessionStatus::Scheduled,
            ]);
        }
    }

    /**
     * Hari kuliah berubah → geser tanggal pertemuan yang BELUM dibuka.
     * Pertemuan yang sudah berjalan tetap (riwayat tidak diubah).
     */
    public static function reschedule(ClassSchedule $schedule): void
    {
        $dates = self::dates($schedule);

        $schedule->sessions()
            ->where('status', SessionStatus::Scheduled)
            ->get()
            ->each(function (AttendanceSession $session) use ($dates): void {
                $date = $dates[$session->meeting_no - 1] ?? null;
                if ($date !== null) {
                    $session->update(['session_date' => $date->toDateString()]);
                }
            });
    }

    /** @return list<CarbonImmutable> */
    private static function dates(ClassSchedule $schedule): array
    {
        $schedule->loadMissing('academicPeriod');
        $start = CarbonImmutable::parse($schedule->academicPeriod->start_date->toDateString());

        // Hari pertama yang cocok (1 = Senin … 7 = Minggu, ISO).
        $offset = ($schedule->day_of_week - $start->dayOfWeekIso + 7) % 7;
        $first = $start->addDays($offset);

        // Model yang baru dibuat belum memuat default kolom dari database (total_meetings = null);
        // tanpa cadangan ini range(0, -1) hanya menghasilkan 2 pertemuan bertanggal salah.
        $total = (int) ($schedule->total_meetings ?: Settings::int('total_meetings'));

        return array_map(
            fn (int $week): CarbonImmutable => $first->addWeeks($week),
            range(0, max($total, 1) - 1),
        );
    }
}
