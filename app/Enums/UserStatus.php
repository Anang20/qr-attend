<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Status akun. */
enum UserStatus: string
{
    use HasOptions;

    case Pending = 'pending';
    case Active = 'active';
    case Inactive = 'inactive';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu',
            self::Active => 'Aktif',
            self::Inactive => 'Nonaktif',
            self::Rejected => 'Ditolak',
        };
    }
}
