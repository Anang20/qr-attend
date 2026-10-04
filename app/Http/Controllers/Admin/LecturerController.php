<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActiveStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LecturerRequest;
use App\Models\Lecturer;
use App\Models\User;
use App\Support\Options;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class LecturerController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['q', 'study_program_id', 'account']);

        $lecturers = Lecturer::query()
            ->with(['user:id,name,email,phone,status', 'studyProgram:id,name'])
            ->when($filters['q'] ?? null, fn ($q, string $s) => $q->where(fn ($w) => $w
                ->where('nidn', 'like', "%{$s}%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$s}%"))))
            ->when($filters['study_program_id'] ?? null, fn ($q, string $v) => $q->where('study_program_id', $v))
            ->when($filters['account'] ?? null, fn ($q, string $v) => $q->whereHas('user', fn ($u) => $u->where('status', $v)))
            // Akun menunggu persetujuan tampil paling atas.
            ->orderByRaw("(select case when users.status = 'pending' then 0 else 1 end from users where users.id = lecturers.user_id)")
            ->orderBy('nidn')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Lecturer $l): array => [
                'id' => $l->id,
                'nidn' => $l->nidn,
                'name' => $l->user->name,
                'email' => $l->user->email,
                'phone' => $l->user->phone,
                'study_program_id' => (string) $l->study_program_id,
                'studyProgram' => $l->studyProgram->name,
                'functional_position' => $l->functional_position,
                'status' => $l->status->value,
                'statusLabel' => $l->status->label(),
                'accountStatus' => $l->user->status->value,
                'accountStatusLabel' => $l->user->status->label(),
            ]);

        return Inertia::render('admin/lecturers/index', [
            'lecturers' => $lecturers,
            'filters' => $filters,
            'pendingCount' => User::query()->where('role', UserRole::Lecturer)->where('status', UserStatus::Pending)->count(),
            'options' => [
                'studyPrograms' => Options::studyPrograms(),
                'statuses' => ActiveStatus::options(),
                'accountStatuses' => UserStatus::options(),
            ],
        ]);
    }

    public function store(LecturerRequest $request): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($data): void {
            // Akun dibuat admin langsung aktif; kata sandi awal = NIDN.
            $user = User::query()->forceCreate([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'password' => $data['nidn'],
                'role' => UserRole::Lecturer,
                'status' => UserStatus::Active,
                'email_verified_at' => now(),
                'approved_by' => auth()->id(),
                'approved_at' => now(),
            ]);

            Lecturer::query()->create(['user_id' => $user->id, ...$this->lecturerFields($data)]);
        });

        return back()->with('success', $data['name'].' ditambahkan. Kata sandi awal = NIDN.');
    }

    public function update(LecturerRequest $request, Lecturer $lecturer): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $lecturer): void {
            $lecturer->user()->update([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
            ]);
            $lecturer->update($this->lecturerFields($data));
        });

        return back()->with('success', 'Data '.$data['name'].' disimpan.');
    }

    public function destroy(Lecturer $lecturer): RedirectResponse
    {
        $lecturer->load('user:id,name');
        $name = $lecturer->user->name;

        if ($lecturer->classSchedules()->exists() || $lecturer->advisedClasses()->exists()) {
            return back()->with('error', $name.' tidak bisa dihapus karena masih mengampu mata kuliah atau menjadi dosen wali. Ubah status menjadi Nonaktif.');
        }

        DB::transaction(function () use ($lecturer): void {
            $user = $lecturer->user;
            $lecturer->delete();
            $user->delete();
        });

        return back()->with('success', $name.' dihapus.');
    }

    /** Setujui pendaftaran dosen (BR-25). */
    public function approve(Lecturer $lecturer): RedirectResponse
    {
        $user = $lecturer->user;

        if ($user->status !== UserStatus::Pending) {
            return back()->with('error', 'Akun ini tidak sedang menunggu persetujuan.');
        }

        $user->forceFill([
            'status' => UserStatus::Active,
            'email_verified_at' => $user->email_verified_at ?? now(),
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ])->save();

        return back()->with('success', 'Akun '.$user->name.' disetujui dan sudah bisa masuk.');
    }

    public function reject(Lecturer $lecturer): RedirectResponse
    {
        $user = $lecturer->user;

        if ($user->status !== UserStatus::Pending) {
            return back()->with('error', 'Akun ini tidak sedang menunggu persetujuan.');
        }

        $user->forceFill(['status' => UserStatus::Rejected, 'approved_by' => auth()->id(), 'approved_at' => now()])->save();

        return back()->with('success', 'Pendaftaran '.$user->name.' ditolak.');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function lecturerFields(array $data): array
    {
        return [
            'nidn' => $data['nidn'],
            'study_program_id' => $data['study_program_id'],
            'functional_position' => $data['functional_position'],
            'status' => $data['status'],
        ];
    }
}
