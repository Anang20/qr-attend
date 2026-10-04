<?php

namespace App\Support;

/** Nama hari ISO (1 = Senin). */
final class Days
{
    public const NAMES = [1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis', 5 => 'Jumat', 6 => 'Sabtu', 7 => 'Minggu'];

    public static function name(int $day): string
    {
        return self::NAMES[$day] ?? '-';
    }

    /** Hari kuliah (Senin–Sabtu) untuk dropdown. @return list<array{value: string, label: string}> */
    public static function options(): array
    {
        return array_map(
            fn (int $d): array => ['value' => (string) $d, 'label' => self::NAMES[$d]],
            range(1, 6),
        );
    }

    /** "08:00:00" → "08.00" */
    public static function time(string $time): string
    {
        return str_replace(':', '.', substr($time, 0, 5));
    }
}
