<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;

/**
 * Verifikasi email mahasiswa tanpa harus masuk lebih dulu
 * (akun pending belum bisa masuk). Tautan dilindungi tanda tangan URL.
 */
class VerifyEmailController extends Controller
{
    public function __invoke(int $id, string $hash): RedirectResponse
    {
        $user = User::query()->findOrFail($id);

        abort_unless(hash_equals(sha1($user->getEmailForVerification()), $hash), 403, 'Tautan verifikasi tidak valid.');

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        if ($user->status === UserStatus::Pending) {
            $user->forceFill(['status' => UserStatus::Active])->save();
        }

        return redirect('/masuk')->with('success', 'Email terverifikasi. Silakan masuk.');
    }
}
