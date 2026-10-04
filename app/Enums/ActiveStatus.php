<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Status aktif/nonaktif master. */
enum ActiveStatus: string
{
    use HasOptions;

    case Active = 'active';
    case Inactive = 'inactive';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Aktif',
            self::Inactive => 'Nonaktif',
        };
    }
}
