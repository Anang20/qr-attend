<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Status presensi mahasiswa. */
enum AttendanceStatus: string
{
    use HasOptions;

    case Present = 'present';
    case Late = 'late';
    case Absent = 'absent';
    case Excused = 'excused';

    public function label(): string
    {
        return match ($this) {
            self::Present => 'Hadir',
            self::Late => 'Terlambat',
            self::Absent => 'Tidak Hadir',
            self::Excused => 'Izin',
        };
    }
}
