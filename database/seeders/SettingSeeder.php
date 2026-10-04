<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Services\Settings;
use Illuminate\Database\Seeder;

/** Kebijakan presensi awal (BRD 10.13). */
class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            // key, value, type, locked
            ['qr_validity_minutes', '20', 'int', true],
            ['qr_once_per_session', 'true', 'bool', true],
            ['default_radius_m', '5', 'int', true],
            ['max_location_accuracy_m', '25', 'int', true],
            ['late_after_minutes', '15', 'int', false],
            ['only_during_class_hours', 'true', 'bool', true],
            ['allow_manual_attendance', 'true', 'bool', false],
            ['email_session_summary', 'false', 'bool', false],
            ['min_attendance_percent', '75', 'int', true],
            ['leave_window_before_days', '7', 'int', true],
            ['leave_window_after_days', '2', 'int', true],
            ['campus_center_lat', '-6.3452500', 'float', true],
            ['campus_center_lng', '106.6917000', 'float', true],
            ['campus_max_distance_m', '500', 'int', true],
        ];

        foreach ($rows as [$key, $value, $type, $locked]) {
            Setting::query()->updateOrCreate(
                ['key' => $key],
                ['value' => $value, 'type' => $type, 'is_locked' => $locked],
            );
        }

        Settings::flush();
    }
}
