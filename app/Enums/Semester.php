<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Jenis semester. */
enum Semester: string
{
    use HasOptions;

    case Ganjil = 'ganjil';
    case Genap = 'genap';
    case Antara = 'antara';

    public function label(): string
    {
        return match ($this) {
            self::Ganjil => 'Ganjil',
            self::Genap => 'Genap',
            self::Antara => 'Antara',
        };
    }
}
