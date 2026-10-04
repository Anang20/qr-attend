<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Status pertemuan / sesi presensi. */
enum SessionStatus: string
{
    use HasOptions;

    case Scheduled = 'scheduled';
    case Open = 'open';
    case Expired = 'expired';
    case Closed = 'closed';
    case Missed = 'missed';

    public function label(): string
    {
        return match ($this) {
            self::Scheduled => 'Terjadwal',
            self::Open => 'Dibuka',
            self::Expired => 'Kedaluwarsa',
            self::Closed => 'Ditutup',
            self::Missed => 'Tidak terlaksana',
        };
    }
}
