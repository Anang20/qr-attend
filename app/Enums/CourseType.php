<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Jenis mata kuliah. */
enum CourseType: string
{
    use HasOptions;

    case Wajib = 'wajib';
    case Pilihan = 'pilihan';

    public function label(): string
    {
        return match ($this) {
            self::Wajib => 'Wajib',
            self::Pilihan => 'Pilihan',
        };
    }
}
