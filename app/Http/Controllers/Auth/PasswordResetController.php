<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('auth/forgot-password');
    }

    /** Email kampus atau NIM → kirim tautan atur ulang (berlaku 30 menit). */
    public function send(Request $request): RedirectResponse
    {
        $request->validate(['identifier' => ['required', 'string', 'max:150']]);
        $identifier = trim($request->string('identifier')->toString());

        $email = preg_match('/^\d{12}$/', $identifier) === 1
            ? Student::query()->where('nim', $identifier)->first()?->user?->email
            : Str::lower($identifier);

        if ($email !== null && User::query()->where('email', $email)->exists()) {
            $status = Password::sendResetLink(['email' => $email]);

            if ($status === Password::RESET_THROTTLED) {
                throw ValidationException::withMessages(['identifier' => __($status)]);
            }
        }

        // Pesan sama untuk akun ada / tidak ada, agar tidak membocorkan data.
        return back()->with('success', __('passwords.sent'));
    }

    public function edit(Request $request, string $token): Response
    {
        return Inertia::render('auth/reset-password', [
            'token' => $token,
            'email' => $request->string('email')->toString(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['password' => __($status)]);
        }

        return redirect('/masuk')->with('success', __($status));
    }
}
