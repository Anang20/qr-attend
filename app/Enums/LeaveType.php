<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Jenis pengajuan. */
enum LeaveType: string
{
    use HasOptions;

    case Sick = 'sick';
    case Permit = 'permit';

    public function label(): string
    {
        return match ($this) {
            self::Sick => 'Sakit',
            self::Permit => 'Izin',
        };
    }
}
