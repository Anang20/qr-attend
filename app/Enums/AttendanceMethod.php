<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Metode pencatatan presensi. */
enum AttendanceMethod: string
{
    use HasOptions;

    case Qr = 'qr';
    case Manual = 'manual';
    case Leave = 'leave';
    case System = 'system';

    public function label(): string
    {
        return match ($this) {
            self::Qr => 'QR Code',
            self::Manual => 'Manual',
            self::Leave => 'Pengajuan',
            self::System => 'Sistem',
        };
    }
}
