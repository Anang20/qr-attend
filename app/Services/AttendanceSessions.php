<?php

namespace App\Services;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Enums\PeriodStatus;
use App\Enums\SessionStatus;
use App\Enums\StudentStatus;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Student;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Siklus hidup sesi presensi: buka → kedaluwarsa → selesai (BRD 6.2).
 */
final class AttendanceSessions
{
    /** Awalan isi QR: QRATTEND:{id sesi}:{token}. */
    public const QR_PREFIX = 'QRATTEND';

    /**
     * Token QR dihitung ulang dari id sesi + waktu dibuka + APP_KEY (HMAC),
     * jadi token mentah tidak pernah disimpan di database (NFR-05).
     */
    public static function token(AttendanceSession $session): string
    {
        return hash_hmac('sha256', $session->id.'|'.$session->opened_at?->toIso8601String(), (string) config('app.key'));
    }

    public static function qrPayload(AttendanceSession $session): string
    {
        return self::QR_PREFIX.':'.$session->id.':'.self::token($session);
    }

    /** Jam mulai & selesai pertemuan pada tanggalnya. @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    public static function window(AttendanceSession $session): array
    {
        $session->loadMissing('classSchedule');
        $date = $session->session_date->toDateString();

        return [
            CarbonImmutable::parse($date.' '.$session->classSchedule->start_time),
            CarbonImmutable::parse($date.' '.$session->classSchedule->end_time),
        ];
    }

    /** BR-02: sekarang berada di dalam jam kuliah pertemuan ini. */
    public static function isWithinClassHours(AttendanceSession $session, ?CarbonImmutable $now = null): bool
    {
        if (! config('attendance.enforce_class_hours')) {
            return true;
        }

        $now ??= CarbonImmutable::now();
        [$start, $end] = self::window($session);

        return $now->betweenIncluded($start, $end);
    }

    /**
     * Alasan sesi belum bisa dibuka, atau null bila bisa (BR-01, BR-02, BR-03).
     */
    public static function cannotOpenReason(AttendanceSession $session): ?string
    {
        $session->loadMissing('classSchedule.room', 'classSchedule.academicPeriod');
        $schedule = $session->classSchedule;

        if ($session->status !== SessionStatus::Scheduled) {
            return 'QR hanya dibuat sekali per sesi.';
        }
        if ($schedule->academicPeriod->status !== PeriodStatus::Active) {
            return 'Periode akademik pertemuan ini tidak aktif.';
        }
        if (! $schedule->room->hasPoint() || $schedule->room->status->value !== 'active') {
            return 'Ruang '.$schedule->room->name.' belum punya titik presensi. Hubungi admin.';
        }
        if (config('attendance.enforce_class_hours')) {
            [$start, $end] = self::window($session);
            $now = CarbonImmutable::now();
            if ($now->lt($start)) {
                return 'Tersedia pukul '.$start->format('H.i').', '.$start->translatedFormat('j M Y').'.';
            }
            if ($now->gt($end)) {
                return 'Jam kuliah pertemuan ini sudah lewat.';
            }
        }

        return null;
    }

    /** Buka sesi: QR berlaku 20 menit, titik ruang di-snapshot untuk audit. */
    public static function open(AttendanceSession $session, User $lecturer): void
    {
        $reason = self::cannotOpenReason($session);
        if ($reason !== null) {
            throw ValidationException::withMessages(['session' => $reason]);
        }

        DB::transaction(function () use ($session, $lecturer): void {
            $locked = AttendanceSession::query()->lockForUpdate()->findOrFail($session->id);
            if ($locked->status !== SessionStatus::Scheduled) {
                throw ValidationException::withMessages(['session' => 'QR hanya dibuat sekali per sesi.']);
            }

            $room = $session->classSchedule->room;
            $now = CarbonImmutable::now();

            $locked->forceFill([
                'status' => SessionStatus::Open,
                'opened_at' => $now,
                'expires_at' => $now->addMinutes(Settings::int('qr_validity_minutes')),
                'opened_by' => $lecturer->id,
                'room_latitude' => $room->latitude,
                'room_longitude' => $room->longitude,
                'room_radius_m' => $room->radius_m,
            ])->save();

            $locked->forceFill(['qr_token_hash' => hash('sha256', self::token($locked))])->save();
        });

        $session->refresh();
    }

    /** Ubah status menjadi Kedaluwarsa bila waktunya habis (dipanggil saat diakses & oleh scheduler). */
    public static function expireIfDue(AttendanceSession $session): void
    {
        if ($session->status === SessionStatus::Open && $session->expires_at !== null && now()->gte($session->expires_at)) {
            DB::transaction(function () use ($session): void {
                $session->forceFill(['status' => SessionStatus::Expired])->save();
                self::markAbsentees($session);
            });
        }
    }

    /** Dosen menyelesaikan sesi: rekap disimpan, tidak bisa dibuka lagi. */
    public static function finish(AttendanceSession $session): void
    {
        self::expireIfDue($session);

        if ($session->status === SessionStatus::Open) {
            throw ValidationException::withMessages(['session' => 'Tunggu QR kedaluwarsa sebelum menyelesaikan sesi.']);
        }

        DB::transaction(function () use ($session): void {
            self::markAbsentees($session);
            $session->forceFill(['status' => SessionStatus::Closed, 'closed_at' => now()])->save();
        });
    }

    /**
     * BR-09: mahasiswa tanpa catatan otomatis Tidak Hadir (metode Sistem).
     * Izin yang sudah disetujui sudah tercatat sebagai Izin, jadi tidak tertimpa.
     */
    public static function markAbsentees(AttendanceSession $session): void
    {
        $session->loadMissing('classSchedule');
        $now = now();

        $missing = Student::query()
            ->where('class_group_id', $session->classSchedule->class_group_id)
            ->where('status', StudentStatus::Active)
            ->whereDoesntHave('attendances', fn ($q) => $q->where('attendance_session_id', $session->id))
            ->pluck('id');

        $rows = $missing->map(fn (int $studentId): array => [
            'attendance_session_id' => $session->id,
            'student_id' => $studentId,
            'status' => AttendanceStatus::Absent->value,
            'method' => AttendanceMethod::System->value,
            'recorded_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        if ($rows !== []) {
            // insertOrIgnore: aman bila ada presensi yang masuk bersamaan.
            Attendance::query()->insertOrIgnore($rows);
        }
    }

    /** Status yang ditampilkan: pertemuan terjadwal yang jamnya lewat = "Terlewat". */
    public static function displayStatus(AttendanceSession $session): string
    {
        if ($session->status === SessionStatus::Scheduled) {
            [, $end] = self::window($session);
            if (CarbonImmutable::now()->gt($end)) {
                return 'missed';
            }
        }

        return $session->status->value;
    }
}
