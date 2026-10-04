<?php

namespace App\Http\Controllers;

use App\Enums\ActiveStatus;
use App\Enums\UserRole;
use App\Models\Room;
use App\Models\Setting;
use App\Services\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pengaturan kebijakan presensi (FR-GEN-06). Admin bisa mengubah item yang tidak terkunci;
 * dosen hanya melihat. Item "Kebijakan kampus" (is_locked) tidak bisa diubah dari aplikasi.
 */
class SettingController extends Controller
{
    /** Item yang boleh diubah admin beserta aturannya. */
    private const EDITABLE = [
        'late_after_minutes' => ['required', 'integer', 'in:5,10,15'],
        'allow_manual_attendance' => ['required', 'boolean'],
        'email_session_summary' => ['required', 'boolean'],
    ];

    public function show(Request $request): Response
    {
        $before = Settings::int('leave_window_before_days');
        $after = Settings::int('leave_window_after_days');
        $locked = Setting::query()->pluck('is_locked', 'key');

        $policies = [
            ['key' => 'qr_validity_minutes', 'title' => 'Masa berlaku QR Code', 'description' => 'QR otomatis nonaktif saat timer berakhir.', 'kind' => 'value', 'value' => Settings::int('qr_validity_minutes').' menit'],
            ['key' => 'qr_once_per_session', 'title' => 'Pembuatan QR', 'description' => 'Dosen tidak dapat memperbarui atau membuat ulang QR untuk sesi yang sama.', 'kind' => 'value', 'value' => 'Sekali per sesi'],
            ['key' => 'default_radius_m', 'title' => 'Radius default titik presensi', 'description' => 'Dipakai untuk ruang baru. Radius tiap ruang bisa diatur di Ruang & Titik Presensi.', 'kind' => 'value', 'value' => Settings::int('default_radius_m').' meter'],
            ['key' => 'max_location_accuracy_m', 'title' => 'Batas akurasi lokasi', 'description' => 'Pindaian dengan akurasi GPS lebih buruk dari batas ini ditolak dan mahasiswa diminta mengulang.', 'kind' => 'value', 'value' => Settings::int('max_location_accuracy_m').' meter'],
            ['key' => 'late_after_minutes', 'title' => 'Tandai Terlambat setelah', 'description' => 'Pindaian setelah menit ini dalam jendela QR dicatat Terlambat.', 'kind' => 'select', 'value' => (string) Settings::int('late_after_minutes'), 'options' => [['value' => '5', 'label' => '5 menit'], ['value' => '10', 'label' => '10 menit'], ['value' => '15', 'label' => '15 menit']]],
            ['key' => 'min_attendance_percent', 'title' => 'Batas minimal kehadiran', 'description' => 'Syarat ikut UAS. Izin dan sakit yang disetujui dihitung hadir. Dipakai di Rekap Kehadiran.', 'kind' => 'value', 'value' => Settings::int('min_attendance_percent').'%'],
            ['key' => 'leave_window', 'title' => 'Batas pengajuan izin/sakit', 'description' => "Mahasiswa bisa mengajukan mulai {$before} hari sebelum sampai {$after} hari setelah pertemuan.", 'kind' => 'value', 'value' => "H-{$before} s.d. H+{$after}"],
            ['key' => 'only_during_class_hours', 'title' => 'Hanya pada jam kuliah', 'description' => 'Sesi tidak bisa dimulai, dan QR tidak berlaku, di luar jadwal kuliah.', 'kind' => 'switch', 'value' => (bool) Settings::get('only_during_class_hours')],
            ['key' => 'allow_manual_attendance', 'title' => 'Izinkan presensi manual', 'description' => 'Dosen dapat menetapkan Hadir, Terlambat, Tidak Hadir, atau Izin. Tercatat sebagai "Manual".', 'kind' => 'switch', 'value' => (bool) Settings::get('allow_manual_attendance')],
            ['key' => 'email_session_summary', 'title' => 'Kirim ringkasan sesi ke email dosen', 'description' => 'Dikirim saat sesi berakhir.', 'kind' => 'switch', 'value' => (bool) Settings::get('email_session_summary')],
        ];

        return Inertia::render('shared/settings', [
            'canEdit' => $request->user()->role === UserRole::Admin,
            'policies' => array_map(fn (array $p): array => [
                ...$p,
                // leave_window gabungan dua setting terkunci.
                'isLocked' => $p['key'] === 'leave_window' ? true : (bool) ($locked[$p['key']] ?? ! array_key_exists($p['key'], self::EDITABLE)),
            ], $policies),
            'rooms' => [
                'ready' => Room::query()->where('status', ActiveStatus::Active)->whereNotNull('latitude')->count(),
                'missing' => Room::query()->where('status', ActiveStatus::Active)->whereNull('latitude')->pluck('name'),
                'inactive' => Room::query()->where('status', ActiveStatus::Inactive)->count(),
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        abort_unless($request->user()->role === UserRole::Admin, 403);

        $request->validate(self::EDITABLE);
        $data = [
            'late_after_minutes' => $request->integer('late_after_minutes'),
            'allow_manual_attendance' => $request->boolean('allow_manual_attendance'),
            'email_session_summary' => $request->boolean('email_session_summary'),
        ];
        $locked = Setting::query()->whereIn('key', array_keys($data))->where('is_locked', true)->pluck('key');
        if ($locked->isNotEmpty()) {
            return back()->with('error', 'Kebijakan kampus tidak bisa diubah dari aplikasi.');
        }

        DB::transaction(function () use ($data, $request): void {
            foreach ($data as $key => $value) {
                Setting::query()->updateOrCreate(['key' => $key], [
                    'value' => is_bool($value) ? ($value ? 'true' : 'false') : (string) $value,
                    'type' => is_bool($value) ? 'bool' : 'int',
                    'updated_by' => $request->user()->id,
                ]);
            }
        });
        Settings::flush();

        return back()->with('success', 'Pengaturan disimpan.');
    }
}
