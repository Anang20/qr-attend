<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Status perangkat presensi. */
enum DeviceStatus: string
{
    use HasOptions;

    case Active = 'active';
    case Revoked = 'revoked';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Terikat',
            self::Revoked => 'Dicabut',
        };
    }
}
