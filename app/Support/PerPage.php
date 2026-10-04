<?php

namespace App\Support;

use Illuminate\Http\Request;

/** Batas baris per halaman untuk semua tabel (query `per_page`), bawaan 10. */
final class PerPage
{
    public const DEFAULT = 10;

    public const OPTIONS = [10, 25, 50, 100];

    public static function from(Request $request): int
    {
        $value = $request->integer('per_page');

        return in_array($value, self::OPTIONS, true) ? $value : self::DEFAULT;
    }
}
