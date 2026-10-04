<?php

namespace App\Console\Commands;

use App\Enums\SessionStatus;
use App\Models\AttendanceSession;
use App\Services\AttendanceSessions;
use Illuminate\Console\Command;

/**
 * Menutup sesi yang QR-nya sudah lewat 20 menit dan menandai mahasiswa yang belum presensi
 * sebagai Tidak Hadir (BR-09). Dijalankan scheduler tiap menit; halaman juga memanggilnya
 * saat diakses, jadi aplikasi tetap benar walau scheduler belum dijalankan.
 */
class ExpireAttendanceSessions extends Command
{
    protected $signature = 'attendance:expire-sessions';

    protected $description = 'Tandai sesi presensi yang sudah lewat masa berlaku QR sebagai kedaluwarsa';

    public function handle(): int
    {
        $count = 0;

        AttendanceSession::query()
            ->where('status', SessionStatus::Open)
            ->where('expires_at', '<=', now())
            ->each(function (AttendanceSession $session) use (&$count): void {
                AttendanceSessions::expireIfDue($session);
                $count++;
            });

        $this->info("{$count} sesi ditandai kedaluwarsa.");

        return self::SUCCESS;
    }
}
