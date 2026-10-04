<?php

namespace App\Http\Controllers;

use App\Enums\RequestStatus;
use App\Enums\ResetReason;
use App\Enums\UserRole;
use App\Models\AcademicPeriod;
use App\Models\DeviceResetRequest;
use App\Services\DeviceBinding;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Profil untuk semua peran: identitas, kontak, kata sandi,
 * perangkat presensi (mahasiswa) dan sesi masuk lain (admin/dosen).
 */
class ProfileController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user();
        $props = [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role->value,
                'roleLabel' => $user->role->label(),
                'initials' => $user->initials(),
            ],
            'period' => AcademicPeriod::active()?->label(),
        ];

        if ($user->role === UserRole::Student) {
            $student = $user->student()->with(['studyProgram:id,name', 'classGroup.advisor.user:id,name'])->firstOrFail();
            $device = DeviceBinding::activeDevice($user);
            $pending = DeviceResetRequest::query()->where('user_id', $user->id)->where('status', RequestStatus::Pending)->latest()->first();
            $now = CarbonImmutable::now();

            $props['academic'] = [
                ['label' => 'NIM', 'value' => $student->nim],
                ['label' => 'Program studi', 'value' => $student->studyProgram->name],
                ['label' => 'Kelas', 'value' => $student->classGroup->code],
                ['label' => 'Angkatan', 'value' => (string) $student->cohort_year],
                ['label' => 'Dosen wali', 'value' => $student->classGroup->advisor?->user->name ?? '—'],
                // Semester ganjil dimulai Agustus.
                ['label' => 'Semester', 'value' => (string) max(1, ($now->year - (int) $student->cohort_year) * 2 + ($now->month >= 8 ? 1 : 0))],
            ];
            $props['studentStatus'] = $student->status->label();
            $props['device'] = $device ? [
                'name' => $device->device_name,
                'platform' => $device->platform,
                'boundAt' => $device->bound_at->toIso8601String(),
                'isThisDevice' => DeviceBinding::matchingDevice($user, $request) !== null,
            ] : null;
            $props['resetRequest'] = $pending ? ['id' => $pending->id, 'reason' => $pending->reason->label(), 'createdAt' => $pending->created_at?->toIso8601String()] : null;
            $props['resetReasons'] = ResetReason::options();
        } else {
            $lecturer = $user->role === UserRole::Lecturer ? $user->lecturer()->with('studyProgram:id,name')->first() : null;
            $props['academic'] = $lecturer ? [
                ['label' => 'NIDN', 'value' => $lecturer->nidn],
                ['label' => 'Prodi homebase', 'value' => $lecturer->studyProgram->name],
                ['label' => 'Jabatan fungsional', 'value' => $lecturer->functional_position ?? '—'],
            ] : [['label' => 'Peran', 'value' => 'Administrator · Bagian Akademik']];
            $props['otherSessions'] = DB::table('sessions')->where('user_id', $user->id)->where('id', '!=', $request->session()->getId())->count();
        }

        return Inertia::render('shared/profile', $props);
    }

    public function updateContact(Request $request): RedirectResponse
    {
        $user = $request->user();
        $rules = ['phone' => ['nullable', 'regex:/^08\d{8,11}$/']];
        // Nama mahasiswa mengikuti data akademik; admin/dosen boleh mengubah nama & gelar.
        if ($user->role !== UserRole::Student) {
            $rules['name'] = ['required', 'string', 'min:3', 'max:150'];
        }

        $data = $request->validate($rules, ['phone.regex' => 'No. HP harus diawali 08 dan berisi 10–13 digit.']);
        $user->update($data);

        return back()->with('success', 'Data kontak disimpan.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', 'different:current_password', Password::defaults()],
        ], ['password.different' => 'Kata sandi baru harus berbeda dari kata sandi saat ini.']);

        $request->user()->update(['password' => $request->string('password')->toString()]);

        return back()->with('success', 'Kata sandi diperbarui.');
    }

    /** Keluarkan semua sesi masuk lain milik pengguna ini (butuh kata sandi). */
    public function logoutOtherSessions(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);

        $count = DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        return back()->with('success', $count > 0 ? "{$count} perangkat lain dikeluarkan." : 'Tidak ada perangkat lain yang sedang masuk.');
    }

    /** Mahasiswa meminta reset perangkat presensi (disetujui admin). */
    public function requestDeviceReset(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->role === UserRole::Student, 403);

        $data = $request->validate(['reason' => ['required', Rule::enum(ResetReason::class)]], ['reason.required' => 'Pilih alasan reset.']);

        $exists = DeviceResetRequest::query()->where('user_id', $user->id)->where('status', RequestStatus::Pending)->exists();
        if ($exists) {
            throw ValidationException::withMessages(['reason' => 'Permintaan reset sebelumnya masih menunggu.']);
        }

        DeviceResetRequest::query()->create([
            'user_id' => $user->id,
            'device_id' => DeviceBinding::activeDevice($user)?->id,
            'reason' => $data['reason'],
            'status' => RequestStatus::Pending,
        ]);

        return back()->with('success', 'Permintaan reset perangkat dikirim ke admin.');
    }

    public function cancelDeviceReset(Request $request, DeviceResetRequest $resetRequest): RedirectResponse
    {
        abort_unless((int) $resetRequest->user_id === (int) $request->user()->id, 404);

        if ($resetRequest->status === RequestStatus::Pending) {
            $resetRequest->update(['status' => RequestStatus::Cancelled]);
        }

        return back()->with('success', 'Permintaan reset dibatalkan.');
    }
}
