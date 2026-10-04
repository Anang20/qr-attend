<?php

namespace App\Http\Requests\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Lecturer;
use App\Models\Student;
use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Masuk dengan satu kolom identitas: NIM (12 digit), NIDN (10 digit), atau email kampus.
 * Peran diambil dari data akun, bukan dari pilihan pengguna.
 */
class LoginRequest extends FormRequest
{
    private const MAX_ATTEMPTS = 5;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string', 'max:150'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * @throws ValidationException
     */
    public function authenticate(): User
    {
        $this->ensureIsNotRateLimited();

        $user = $this->findUser(trim($this->string('identifier')->toString()));

        if ($user === null || ! Hash::check($this->string('password')->toString(), $user->password)) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages(['identifier' => __('auth.failed')]);
        }

        // Status hanya dibuka setelah kata sandi benar, agar tidak membocorkan keberadaan akun.
        $this->ensureCanSignIn($user);

        RateLimiter::clear($this->throttleKey());
        Auth::login($user);
        $user->forceFill(['last_login_at' => now()])->save();

        return $user;
    }

    private function findUser(string $identifier): ?User
    {
        if (str_contains($identifier, '@')) {
            return User::query()->where('email', Str::lower($identifier))->first();
        }

        if (preg_match('/^\d{12}$/', $identifier) === 1) {
            return Student::query()->where('nim', $identifier)->first()?->user;
        }

        if (preg_match('/^\d{10}$/', $identifier) === 1) {
            return Lecturer::query()->where('nidn', $identifier)->first()?->user;
        }

        throw ValidationException::withMessages([
            'identifier' => 'Gunakan NIM (12 digit), NIDN (10 digit), atau email kampus.',
        ]);
    }

    private function ensureCanSignIn(User $user): void
    {
        $message = match ($user->status) {
            UserStatus::Active => null,
            UserStatus::Pending => $user->role === UserRole::Lecturer
                ? 'Akun Anda masih menunggu persetujuan admin prodi.'
                : 'Email belum diverifikasi. Buka tautan verifikasi di email kampus Anda.',
            UserStatus::Rejected => 'Pendaftaran akun Anda ditolak. Hubungi admin prodi.',
            UserStatus::Inactive => 'Akun Anda nonaktif. Hubungi admin akademik.',
        };

        if ($message !== null) {
            throw ValidationException::withMessages(['identifier' => $message]);
        }
    }

    private function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), self::MAX_ATTEMPTS)) {
            return;
        }

        event(new Lockout($this));

        throw ValidationException::withMessages([
            'identifier' => __('auth.throttle', ['seconds' => RateLimiter::availableIn($this->throttleKey())]),
        ]);
    }

    private function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('identifier')->toString()).'|'.$this->ip());
    }
}
