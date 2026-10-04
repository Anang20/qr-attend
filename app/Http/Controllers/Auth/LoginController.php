<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\DeviceBinding;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LoginController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('auth/login');
    }

    public function store(LoginRequest $request): RedirectResponse
    {
        $user = $request->authenticate();
        $request->session()->regenerate();

        // BR-07: perangkat pertama yang dipakai mahasiswa masuk diikat ke akunnya.
        if ($user->role === UserRole::Student) {
            DeviceBinding::onLogin($user, $request);
        }

        return redirect()->intended($user->role->homePath());
    }

    public function destroy(Request $request): RedirectResponse
    {
        auth()->guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/masuk');
    }
}
