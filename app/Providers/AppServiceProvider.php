<?php

namespace App\Providers;

use Illuminate\Support\Facades\Date;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Date::use(\Carbon\CarbonImmutable::class);
        // Nama hari/bulan Indonesia untuk translatedFormat() (mis. "Sen, 28 Sep 2026").
        \Carbon\Carbon::setLocale(config('app.locale'));

        // BR-26: min. 8 karakter, huruf besar, huruf kecil, dan angka.
        Password::defaults(fn () => Password::min(8)->mixedCase()->numbers());
    }
}
