<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * Membaca kebijakan presensi dari tabel `settings`.
 * Nilai di-cache; bila belum ada baris, memakai config/attendance.php.
 */
final class Settings
{
    private const CACHE_KEY = 'app.settings';

    public static function get(string $key): int|float|bool|string|null
    {
        $all = Cache::rememberForever(self::CACHE_KEY, fn (): array => Setting::query()
            ->get(['key', 'value', 'type'])
            ->mapWithKeys(fn (Setting $s): array => [$s->key => self::cast($s->value, $s->type)])
            ->all());

        return $all[$key] ?? config("attendance.{$key}");
    }

    public static function int(string $key): int
    {
        return (int) self::get($key);
    }

    public static function float(string $key): float
    {
        return (float) self::get($key);
    }

    public static function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    private static function cast(string $value, string $type): int|float|bool|string
    {
        return match ($type) {
            'int' => (int) $value,
            'float' => (float) $value,
            'bool' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            default => $value,
        };
    }
}
