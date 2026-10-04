<?php

namespace App\Http\Middleware;

use App\Enums\RequestStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\AcademicPeriod;
use App\Models\DeviceResetRequest;
use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Props yang tersedia di semua halaman.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'appName' => config('app.name'),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->value,
                    'roleLabel' => $user->role->label(),
                    'initials' => $user->initials(),
                ] : null,
            ],
            // Periode aktif ditampilkan di header admin & dosen.
            'activePeriod' => $user ? fn () => AcademicPeriod::active()?->label() : null,
            // Angka kecil di menu (mis. Persetujuan Izin "3").
            'badges' => $user ? fn (): array => $this->badges($user) : [],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
        ];
    }

    /** @return array<string, int> */
    private function badges(User $user): array
    {
        return match ($user->role) {
            UserRole::Lecturer => [
                'leave' => LeaveRequest::query()
                    ->where('status', RequestStatus::Pending)
                    ->whereHas('session.classSchedule', fn ($q) => $q
                        ->where('lecturer_id', $user->lecturer()->value('id'))
                        ->where('academic_period_id', AcademicPeriod::active()?->id))
                    ->count(),
            ],
            UserRole::Admin => [
                'dashboard' => DeviceResetRequest::query()->where('status', RequestStatus::Pending)->count()
                    + User::query()->where('role', UserRole::Lecturer)->where('status', UserStatus::Pending)->count(),
            ],
            UserRole::Student => [],
        };
    }
}
