<?php

namespace App\Enums\Concerns;

/**
 * Bentuk opsi enum untuk dropdown di frontend: [{ value, label }].
 */
trait HasOptions
{
    /** @return list<array{value: string, label: string}> */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
