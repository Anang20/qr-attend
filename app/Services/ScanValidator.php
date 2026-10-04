<?php

namespace App\Services;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use App\Enums\ScanResult;
use App\Enums\SessionStatus;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ScanLog;
use App\Models\Student;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;

/**
 * Validasi pindaian QR mahasiswa — 8 pemeriksaan BERURUTAN (BRD 5.5).
 * Berhenti di pemeriksaan pertama yang gagal; urutan sama dengan checklist di layar.
 */
final class ScanValidator
{
    /** Urutan & label checklist (dipakai juga di frontend). */
    public const CHECKS = [
        'auth' => 'Masuk sebagai mahasiswa',
        'qr' => 'QR Code valid',
        'open' => 'Sesi masih dibuka',
        'class' => 'Terdaftar di kelas ini',
        'schedule' => 'Di dalam jadwal',
        'duplicate' => 'Belum pernah presensi',
        'device' => 'Perangkat terikat',
        'location' => 'Lokasi akurat & dalam radius ruang',
    ];

    /**
     * @param  array{payload: string, latitude: float, longitude: float, accuracy: float}  $input
     * @return array{result: ScanResult, failedCheck: ?string, session: ?AttendanceSession, attendance: ?Attendance, distance: ?float, accuracy: float, existing: ?Attendance}
     */
    public static function validate(Student $student, array $input, Request $request): array
    {
        $out = fn (ScanResult $result, ?string $check, ?AttendanceSession $session = null, ?float $distance = null, ?Attendance $attendance = null, ?Attendance $existing = null): array => [
            'result' => $result,
            'failedCheck' => $check,
            'session' => $session,
            'attendance' => $attendance,
            'distance' => $distance,
            'accuracy' => $input['accuracy'],
            'existing' => $existing,
        ];

        $now = CarbonImmutable::now();

        // 1. Masuk sebagai mahasiswa — dijamin middleware auth + role:student.

        // 2. QR valid: format, sesi ada, token cocok.
        $session = self::parse($input['payload']);
        if ($session === null) {
            return self::log($student, $input, $request, $out(ScanResult::InvalidQr, 'qr'));
        }
        $session->loadMissing('classSchedule.course', 'classSchedule.room', 'classSchedule.classGroup');

        // 3. Sesi masih dibuka (QR berlaku 20 menit).
        AttendanceSessions::expireIfDue($session);
        if ($session->status !== SessionStatus::Open) {
            return self::log($student, $input, $request, $out(ScanResult::Expired, 'open', $session));
        }

        // 4. Terdaftar di kelas sesi ini.
        if ((int) $student->class_group_id !== (int) $session->classSchedule->class_group_id) {
            return self::log($student, $input, $request, $out(ScanResult::WrongClass, 'class', $session));
        }

        // 5. Di dalam jadwal (tanggal & jam kuliah).
        if (! AttendanceSessions::isWithinClassHours($session, $now)) {
            return self::log($student, $input, $request, $out(ScanResult::WrongSchedule, 'schedule', $session));
        }

        // 6. Belum pernah presensi di sesi ini.
        $existing = Attendance::query()->where('attendance_session_id', $session->id)->where('student_id', $student->id)->first();
        if ($existing !== null) {
            return self::log($student, $input, $request, $out(ScanResult::Duplicate, 'duplicate', $session, existing: $existing));
        }

        // 7. Perangkat terikat (BR-07).
        $device = DeviceBinding::matchingDevice($student->user, $request);
        if ($device === null) {
            return self::log($student, $input, $request, $out(ScanResult::DeviceMismatch, 'device', $session));
        }

        // 8. Lokasi: akurasi ≤ 25 m (BR-05), lalu jarak ≤ radius ruang (BR-06).
        if ($input['accuracy'] > Settings::int('max_location_accuracy_m')) {
            return self::log($student, $input, $request, $out(ScanResult::LowAccuracy, 'location', $session), $device->id);
        }

        $distance = Geo::distanceMeters(
            (float) $session->room_latitude,
            (float) $session->room_longitude,
            $input['latitude'],
            $input['longitude'],
        );
        if ($distance > (int) $session->room_radius_m) {
            return self::log($student, $input, $request, $out(ScanResult::OutsideRadius, 'location', $session, $distance), $device->id);
        }

        // Semua lolos → catat Hadir / Terlambat (BR-08).
        $lateAfter = $session->opened_at->addMinutes(Settings::int('late_after_minutes'));

        try {
            $attendance = Attendance::query()->create([
                'attendance_session_id' => $session->id,
                'student_id' => $student->id,
                'status' => $now->gt($lateAfter) ? AttendanceStatus::Late : AttendanceStatus::Present,
                'method' => AttendanceMethod::Qr,
                'recorded_at' => $now,
                'latitude' => $input['latitude'],
                'longitude' => $input['longitude'],
                'accuracy_m' => round($input['accuracy'], 1),
                'distance_m' => round($distance, 1),
                'device_id' => $device->id,
            ]);
        } catch (UniqueConstraintViolationException) {
            // Dua pindaian bersamaan: yang kedua dianggap duplikat (NFR-11).
            $existing = Attendance::query()->where('attendance_session_id', $session->id)->where('student_id', $student->id)->first();

            return self::log($student, $input, $request, $out(ScanResult::Duplicate, 'duplicate', $session, existing: $existing), $device->id);
        }

        return self::log($student, $input, $request, $out(ScanResult::Success, null, $session, $distance, $attendance), $device->id);
    }

    /** "QRATTEND:{id}:{token}" → sesi, bila token cocok (hash_equals, tahan timing attack). */
    private static function parse(string $payload): ?AttendanceSession
    {
        $parts = explode(':', trim($payload));
        if (count($parts) !== 3 || $parts[0] !== AttendanceSessions::QR_PREFIX || ! ctype_digit($parts[1])) {
            return null;
        }

        $session = AttendanceSession::query()->find((int) $parts[1]);
        if ($session === null || $session->opened_at === null) {
            return null;
        }

        return hash_equals(AttendanceSessions::token($session), $parts[2]) ? $session : null;
    }

    /**
     * @param  array{result: ScanResult, failedCheck: ?string, session: ?AttendanceSession, attendance: ?Attendance, distance: ?float, accuracy: float, existing: ?Attendance}  $outcome
     * @param  array{payload: string, latitude: float, longitude: float, accuracy: float}  $input
     * @return array{result: ScanResult, failedCheck: ?string, session: ?AttendanceSession, attendance: ?Attendance, distance: ?float, accuracy: float, existing: ?Attendance}
     */
    private static function log(Student $student, array $input, Request $request, array $outcome, ?int $deviceId = null): array
    {
        // FR-ATT-07: semua pindaian tercatat untuk audit.
        ScanLog::query()->create([
            'attendance_session_id' => $outcome['session']?->id,
            'student_id' => $student->id,
            'result' => $outcome['result'],
            'latitude' => $input['latitude'],
            'longitude' => $input['longitude'],
            'accuracy_m' => round($input['accuracy'], 1),
            'distance_m' => $outcome['distance'] !== null ? round($outcome['distance'], 1) : null,
            'device_id' => $deviceId,
            'ip' => $request->ip(),
            'created_at' => now(),
        ]);

        return $outcome;
    }
}
