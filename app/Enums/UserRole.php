<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Peran akun. */
enum UserRole: string
{
    use HasOptions;

    case Admin = 'admin';
    case Lecturer = 'lecturer';
    case Student = 'student';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Admin',
            self::Lecturer => 'Dosen',
            self::Student => 'Mahasiswa',
        };
    }

    /** Dasbor tujuan setelah masuk. */
    public function homePath(): string
    {
        return match ($this) {
            self::Admin => '/admin',
            self::Lecturer => '/dosen',
            self::Student => '/mahasiswa',
        };
    }
}
