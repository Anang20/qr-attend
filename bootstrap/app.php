<?php

use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'role' => EnsureRole::class,
        ]);

        // Pengguna yang belum masuk diarahkan ke halaman Masuk.
        $middleware->redirectGuestsTo('/masuk');
        // Pengguna yang sudah masuk diarahkan ke dasbor perannya.
        $middleware->redirectUsersTo(fn () => auth()->user()?->role->homePath() ?? '/');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
