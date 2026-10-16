<?php

namespace App\Console\Commands;

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
        $count = AttendanceSessions::expireAllDue();

        $this->info("{$count} sesi ditandai kedaluwarsa.");

        return self::SUCCESS;
    }
}
