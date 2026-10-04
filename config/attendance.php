<?php

/*
| Nilai cadangan kebijakan presensi.
| Nilai yang berlaku disimpan di tabel `settings` (bisa diubah tanpa deploy);
| nilai di sini hanya dipakai bila baris setting belum ada.
*/

return [
    'qr_validity_minutes' => 20,
    'default_radius_m' => 5,
    'min_radius_m' => 3,
    'max_radius_m' => 50,
    'max_location_accuracy_m' => 25,
    'late_after_minutes' => 15,
    'min_attendance_percent' => 75,
    'total_meetings' => 16,
    'leave_window_before_days' => 7,
    'leave_window_after_days' => 2,

    // BR-02: sesi hanya bisa dibuka & dipindai pada jam kuliah.
    // Set ATTENDANCE_ENFORCE_CLASS_HOURS=false HANYA untuk uji coba di luar jam kuliah.
    'enforce_class_hours' => (bool) env('ATTENDANCE_ENFORCE_CLASS_HOURS', true),

    // Alat bantu uji (isi QR manual & lokasi simulasi). Hanya aktif bila APP_DEBUG=true.
    'dev_tools' => (bool) env('APP_DEBUG', false) && (bool) env('ATTENDANCE_DEV_TOOLS', false),

    // Pusat kampus Universitas Pamulang (dipakai validasi titik ruang, BR-23).
    'campus_center_lat' => -6.3452500,
    'campus_center_lng' => 106.6917000,
    'campus_max_distance_m' => 500,
];
