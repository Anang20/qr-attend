<?php

namespace Database\Seeders;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Enums\PeriodStatus;
use App\Enums\SessionStatus;
use App\Models\AcademicPeriod;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ClassGroup;
use App\Models\ClassSchedule;
use App\Models\Course;
use App\Models\Lecturer;
use App\Models\Room;
use App\Models\Student;
use App\Services\ScheduleSessions;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

/**
 * Pemetaan kelas contoh (sesuai desain) + 16 pertemuan.
 * Pertemuan yang tanggalnya sudah lewat diisi riwayat presensi agar rekap punya data.
 */
class ScheduleSeeder extends Seeder
{
    public function run(): void
    {
        $active = AcademicPeriod::query()->where('status', PeriodStatus::Active)->firstOrFail();
        $previous = AcademicPeriod::query()->where('academic_year', '2025/2026')->where('semester', 'genap')->firstOrFail();

        // kelas, kode MK, NIDN dosen, kode ruang, hari (1=Senin), mulai, selesai
        $activeRows = [
            ['SI-5A', 'IF-305', '0412088501', 'R301', 1, '08:00', '09:40'],
            ['SI-5A', 'SI-309', '0415078302', 'R210', 1, '10:00', '11:40'],
            ['SI-5A', 'IF-311', '0420098603', 'LAB1', 1, '13:00', '14:40'],
            ['SI-5A', 'MA-210', '0402028804', 'R208', 3, '10:00', '11:40'],
            ['SI-5A', 'SI-307', '0412088501', 'LAB2', 4, '13:00', '14:40'],
            ['SI-5B', 'IF-305', '0412088501', 'R301', 2, '08:00', '09:40'],
            ['SI-5C', 'IF-305', '0412088501', 'R301', 2, '10:00', '11:40'],
            ['SI-5C', 'SI-307', '0412088501', 'LAB2', 3, '08:00', '09:40'],
            ['SI-5D', 'IF-305', '0412088501', 'R302', 3, '13:00', '14:40'],
            ['SI-5D', 'SI-307', '0412088501', 'LAB2', 4, '08:00', '09:40'],
            ['SI-3A', 'SI-201', '0412088501', 'R204', 5, '08:00', '09:40'],
            ['SI-3B', 'SI-201', '0412088501', 'R204', 5, '10:00', '11:40'],
            ['SI-3A', 'IF-230', '0409058706', 'R204', 1, '08:00', '09:40'],
            ['SI-3C', 'IF-230', '0418118405', 'R208', 4, '10:00', '11:40'],
            ['SI-7A', 'SI-401', '0415078302', 'R302', 2, '13:00', '16:20'],
        ];

        // Periode lalu: SI-7B punya pemetaan di Genap 2025/2026 tetapi kosong di periode aktif
        // (untuk mencoba "Salin pemetaan dari periode sebelumnya").
        $previousRows = [
            ['SI-7B', 'IF-305', '0412088501', 'R301', 1, '08:00', '09:40'],
            ['SI-7B', 'SI-309', '0415078302', 'R210', 1, '10:00', '11:40'],
            ['SI-7B', 'MA-210', '0402028804', 'R208', 3, '10:00', '11:40'],
            ['SI-7B', 'SI-307', '0412088501', 'LAB2', 4, '13:00', '14:40'],
        ];

        $this->createSchedules($active, $activeRows);
        $this->createSchedules($previous, $previousRows);

        $this->fillPastAttendance($active);

        // Periode lalu: semua pertemuan dianggap sudah selesai (tanpa detail presensi).
        AttendanceSession::query()
            ->whereHas('classSchedule', fn ($q) => $q->where('academic_period_id', $previous->id))
            ->update(['status' => SessionStatus::Closed->value]);
    }

    /** @param  list<array{0: string, 1: string, 2: string, 3: string, 4: int, 5: string, 6: string}>  $rows */
    private function createSchedules(AcademicPeriod $period, array $rows): void
    {
        foreach ($rows as [$class, $course, $nidn, $room, $day, $start, $end]) {
            $schedule = ClassSchedule::query()->create([
                'academic_period_id' => $period->id,
                'class_group_id' => ClassGroup::query()->where('code', $class)->value('id'),
                'course_id' => Course::query()->where('code', $course)->value('id'),
                'lecturer_id' => Lecturer::query()->where('nidn', $nidn)->value('id'),
                'room_id' => Room::query()->where('code', $room)->value('id'),
                'day_of_week' => $day,
                'start_time' => $start,
                'end_time' => $end,
                'total_meetings' => 16,
            ]);

            ScheduleSessions::generate($schedule);
        }
    }

    /**
     * Pertemuan yang tanggalnya sebelum hari ini → Ditutup, dengan presensi acak tetapi
     * deterministik (seed tetap): ±85% Hadir, 5% Terlambat, 3% Izin, sisanya Tidak Hadir.
     */
    private function fillPastAttendance(AcademicPeriod $period): void
    {
        mt_srand(20260831);
        $today = CarbonImmutable::today();

        $sessions = AttendanceSession::query()
            ->with(['classSchedule.room'])
            ->whereHas('classSchedule', fn ($q) => $q->where('academic_period_id', $period->id))
            ->whereDate('session_date', '<', $today)
            ->orderBy('session_date')
            ->get();

        foreach ($sessions as $session) {
            $schedule = $session->classSchedule;
            $room = $schedule->room;
            $openedAt = CarbonImmutable::parse($session->session_date->toDateString().' '.$schedule->start_time)->addMinutes(5);

            $session->forceFill([
                'status' => SessionStatus::Closed,
                'opened_at' => $openedAt,
                'expires_at' => $openedAt->addMinutes(20),
                'closed_at' => $openedAt->addMinutes(30),
                'room_latitude' => $room->latitude,
                'room_longitude' => $room->longitude,
                'room_radius_m' => $room->radius_m,
            ])->save();

            $rows = [];
            $students = Student::query()->where('class_group_id', $schedule->class_group_id)->pluck('id');

            foreach ($students as $studentId) {
                $roll = mt_rand(1, 100);
                [$status, $method, $minute] = match (true) {
                    $roll <= 85 => [AttendanceStatus::Present, AttendanceMethod::Qr, mt_rand(0, 14)],
                    $roll <= 90 => [AttendanceStatus::Late, AttendanceMethod::Qr, mt_rand(15, 19)],
                    $roll <= 93 => [AttendanceStatus::Excused, AttendanceMethod::Manual, 25],
                    default => [AttendanceStatus::Absent, AttendanceMethod::System, 20],
                };
                $isQr = $method === AttendanceMethod::Qr;

                $rows[] = [
                    'attendance_session_id' => $session->id,
                    'student_id' => $studentId,
                    'status' => $status->value,
                    'method' => $method->value,
                    'recorded_at' => $openedAt->addMinutes($minute)->addSeconds(mt_rand(0, 59)),
                    'latitude' => $isQr ? $room->latitude : null,
                    'longitude' => $isQr ? $room->longitude : null,
                    'accuracy_m' => $isQr ? mt_rand(30, 150) / 10 : null,
                    'distance_m' => $isQr ? mt_rand(5, 45) / 10 : null,
                    'created_at' => $openedAt,
                    'updated_at' => $openedAt,
                ];
            }

            Attendance::query()->insert($rows);
        }
    }
}
