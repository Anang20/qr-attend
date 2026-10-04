<?php

namespace App\Http\Controllers\Auth;

use App\Enums\ActiveStatus;
use App\Enums\StudentStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\ClassGroup;
use App\Models\Lecturer;
use App\Models\Student;
use App\Models\StudyProgram;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RegisterController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('auth/register', [
            'studyPrograms' => StudyProgram::query()->orderBy('name')->get(['id', 'name'])
                ->map(fn (StudyProgram $p): array => ['value' => (string) $p->id, 'label' => $p->name]),
            'classGroups' => ClassGroup::query()
                ->where('status', ActiveStatus::Active)
                ->orderBy('code')
                ->get(['id', 'code', 'study_program_id', 'cohort_year'])
                ->map(fn (ClassGroup $c): array => [
                    'value' => (string) $c->id,
                    'label' => $c->code,
                    'studyProgramId' => (string) $c->study_program_id,
                    'cohortYear' => (string) $c->cohort_year,
                ]),
            // 'student' | 'lecturer' setelah berhasil mendaftar.
            'registered' => session('registered'),
        ]);
    }

    public function store(RegisterRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $isStudent = $data['role'] === 'student';

        $user = DB::transaction(function () use ($data, $isStudent): User {
            $user = User::query()->forceCreate([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'password' => $data['password'],
                'role' => $isStudent ? UserRole::Student : UserRole::Lecturer,
                // Mahasiswa aktif setelah verifikasi email; dosen setelah disetujui admin.
                'status' => UserStatus::Pending,
            ]);

            if ($isStudent) {
                Student::query()->create([
                    'user_id' => $user->id,
                    'nim' => $data['nim'],
                    'study_program_id' => $data['study_program_id'],
                    'class_group_id' => $data['class_group_id'],
                    'cohort_year' => $data['cohort_year'],
                    'status' => StudentStatus::Active,
                ]);
            } else {
                Lecturer::query()->create([
                    'user_id' => $user->id,
                    'nidn' => $data['nidn'],
                    'study_program_id' => $data['study_program_id'],
                    'status' => ActiveStatus::Active,
                ]);
            }

            return $user;
        });

        if ($isStudent) {
            $user->sendEmailVerificationNotification();
        }

        return redirect('/daftar')->with('registered', $data['role']);
    }
}
