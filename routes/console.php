<?php

use Illuminate\Support\Facades\Schedule;

// BR-09: sesi lewat 20 menit → Kedaluwarsa + tandai Tidak Hadir.
// Jalankan `php artisan schedule:work` di terminal terpisah (opsional saat pengembangan).
Schedule::command('attendance:expire-sessions')->everyMinute()->withoutOverlapping();
