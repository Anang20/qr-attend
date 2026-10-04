<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Status akademik mahasiswa. */
enum StudentStatus: string
{
    use HasOptions;

    case Active = 'active';
    case Leave = 'leave';
    case Graduated = 'graduated';
    case Dropped = 'dropped';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Aktif',
            self::Leave => 'Cuti',
            self::Graduated => 'Lulus',
            self::Dropped => 'Keluar',
        };
    }
}
