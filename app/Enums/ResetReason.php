<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Alasan reset perangkat. */
enum ResetReason: string
{
    use HasOptions;

    case ChangePhone = 'change_phone';
    case LostBroken = 'lost_broken';
    case FactoryReset = 'factory_reset';

    public function label(): string
    {
        return match ($this) {
            self::ChangePhone => 'Ganti ponsel',
            self::LostBroken => 'Hilang atau rusak',
            self::FactoryReset => 'Reset pabrik',
        };
    }
}
