<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Status periode akademik. */
enum PeriodStatus: string
{
    use HasOptions;

    case Upcoming = 'upcoming';
    case Active = 'active';
    case Finished = 'finished';

    public function label(): string
    {
        return match ($this) {
            self::Upcoming => 'Akan datang',
            self::Active => 'Aktif',
            self::Finished => 'Selesai',
        };
    }
}
