<?php

namespace App\Http\Controllers\Student;

use App\Enums\ActiveStatus;
use App\Enums\ScanResult;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Room;
use App\Services\DeviceBinding;
use App\Services\ScanValidator;
use App\Services\Settings;
use App\Support\SessionPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pindai QR mahasiswa → validasi 8 lapis → halaman Berhasil / Gagal.
 */
class ScanController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user();
        $device = DeviceBinding::activeDevice($user);
        $devTools = (bool) config('attendance.dev_tools');

        return Inertia::render('student/scan', [
            'maxAccuracy' => Settings::int('max_location_accuracy_m'),
            'device' => [
                'isBound' => $device !== null,
                'isThisDevice' => DeviceBinding::matchingDevice($user, $request) !== null,
                'name' => $device?->device_name,
            ],
            // Alat uji: hanya bila APP_DEBUG=true dan ATTENDANCE_DEV_TOOLS=true.
            'devTools' => $devTools ? [
                'rooms' => Room::query()->where('status', ActiveStatus::Active)->whereNotNull('latitude')->orderBy('code')
                    ->get(['id', 'name', 'latitude', 'longitude'])
                    ->map(fn (Room $r): array => ['value' => (string) $r->id, 'label' => $r->name, 'latitude' => $r->latitude, 'longitude' => $r->longitude]),
            ] : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'payload' => ['required', 'string', 'max:200'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy' => ['required', 'numeric', 'min:0', 'max:100000'],
        ], [
            'latitude.required' => 'Lokasi belum didapat. Izinkan akses lokasi lalu pindai ulang.',
        ]);

        $student = $request->user()->student()->with('user')->firstOrFail();

        $outcome = ScanValidator::validate($student, [
            'payload' => $data['payload'],
            'latitude' => (float) $data['latitude'],
            'longitude' => (float) $data['longitude'],
            'accuracy' => (float) $data['accuracy'],
        ], $request);

        if ($outcome['result'] === ScanResult::Success && $outcome['attendance'] !== null) {
            return to_route('student.scan.success', $outcome['attendance']);
        }

        // Hasil gagal dibawa lewat flash session (tidak bisa dipalsukan lewat URL).
        return to_route('student.scan.failed')->with('scan', [
            'result' => $outcome['result']->value,
            'failedCheck' => $outcome['failedCheck'],
            'session' => $outcome['session'] ? SessionPresenter::summary($outcome['session']) : null,
            'distance' => $outcome['distance'] !== null ? round($outcome['distance'], 1) : null,
            'accuracy' => round($outcome['accuracy'], 1),
            'radius' => $outcome['session']?->room_radius_m,
            'maxAccuracy' => Settings::int('max_location_accuracy_m'),
            'existingTime' => $outcome['existing']?->recorded_at->format('H.i.s'),
            'existingId' => $outcome['existing']?->id,
            'qrClassGroup' => $outcome['session']?->classSchedule->classGroup->code,
            'expiredAt' => $outcome['session']?->expires_at?->format('H.i'),
        ]);
    }

    public function success(Request $request, Attendance $attendance): Response
    {
        $student = $request->user()->student()->firstOrFail();
        abort_unless((int) $attendance->student_id === (int) $student->id, 404);
        $attendance->load('session');

        return Inertia::render('student/scan-success', [
            'session' => SessionPresenter::summary($attendance->session),
            'attendance' => [
                'id' => $attendance->id,
                'status' => $attendance->status->value,
                'statusLabel' => $attendance->status->label(),
                'method' => $attendance->method->label(),
                'time' => $attendance->recorded_at->format('H.i.s'),
                'date' => $attendance->recorded_at->toDateString(),
                'distance' => $attendance->distance_m,
                'accuracy' => $attendance->accuracy_m,
            ],
        ]);
    }

    public function failed(Request $request): Response|RedirectResponse
    {
        $scan = $request->session()->get('scan');
        if (! is_array($scan)) {
            return to_route('student.scan');
        }

        return Inertia::render('student/scan-failed', [
            'scan' => $scan,
            'checks' => collect(ScanValidator::CHECKS)->map(fn (string $label, string $key): array => ['key' => $key, 'label' => $label])->values(),
        ]);
    }
}
