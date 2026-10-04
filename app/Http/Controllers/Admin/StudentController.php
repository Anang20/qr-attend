<?php

namespace App\Http\Controllers\Admin;

use App\Enums\StudentStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StudentRequest;
use App\Models\Student;
use App\Models\User;
use App\Services\DeviceBinding;
use App\Support\Options;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use App\Support\PerPage;

class StudentController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['q', 'cohort_year', 'class_group_id', 'status']);

        $students = Student::query()
            ->with(['user:id,name,email,phone,status', 'classGroup:id,code', 'studyProgram:id,name'])
            ->withExists(['user as has_device' => fn ($q) => $q->whereHas('devices', fn ($d) => $d->where('status', 'active'))])
            ->when($filters['q'] ?? null, fn ($q, string $s) => $q->where(fn ($w) => $w
                ->where('nim', 'like', "%{$s}%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$s}%"))))
            ->when($filters['cohort_year'] ?? null, fn ($q, string $v) => $q->where('cohort_year', $v))
            ->when($filters['class_group_id'] ?? null, fn ($q, string $v) => $q->where('class_group_id', $v))
            ->when($filters['status'] ?? null, fn ($q, string $v) => $q->where('status', $v))
            ->orderBy('nim')
            ->paginate(PerPage::from($request))
            ->withQueryString()
            ->through(fn (Student $s): array => [
                'id' => $s->id,
                'nim' => $s->nim,
                'name' => $s->user->name,
                'email' => $s->user->email,
                'phone' => $s->user->phone,
                'study_program_id' => (string) $s->study_program_id,
                'studyProgram' => $s->studyProgram->name,
                'cohort_year' => (string) $s->cohort_year,
                'class_group_id' => (string) $s->class_group_id,
                'classGroup' => $s->classGroup->code,
                'status' => $s->status->value,
                'statusLabel' => $s->status->label(),
                'accountStatus' => $s->user->status->value,
                'accountStatusLabel' => $s->user->status->label(),
                'hasDevice' => (bool) $s->has_device,
            ]);

        return Inertia::render('admin/students/index', [
            'students' => $students,
            'filters' => $filters,
            'options' => [
                'studyPrograms' => Options::studyPrograms(),
                'classGroups' => Options::classGroups(),
                'cohortYears' => Options::cohortYears(),
                'statuses' => StudentStatus::options(),
            ],
        ]);
    }

    public function store(StudentRequest $request): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($data): void {
            // Akun dibuat admin langsung aktif; kata sandi awal = NIM.
            $user = User::query()->forceCreate([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'password' => $data['nim'],
                'role' => UserRole::Student,
                'status' => UserStatus::Active,
                'email_verified_at' => now(),
            ]);

            Student::query()->create([
                'user_id' => $user->id,
                ...$this->studentFields($data),
            ]);
        });

        return back()->with('success', $data['name'].' ditambahkan. Kata sandi awal = NIM.');
    }

    public function update(StudentRequest $request, Student $student): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $student): void {
            $student->user()->update([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
            ]);
            $student->update($this->studentFields($data));
        });

        return back()->with('success', 'Data '.$data['name'].' disimpan.');
    }

    public function destroy(Student $student): RedirectResponse
    {
        $student->load('user:id,name');
        $name = $student->user->name;

        // BR-24: mahasiswa yang sudah punya presensi/pengajuan tidak bisa dihapus.
        if ($student->attendances()->exists() || $student->leaveRequests()->exists()) {
            return back()->with('error', $name.' tidak bisa dihapus karena sudah punya data presensi. Ubah status menjadi Keluar/Lulus.');
        }

        DB::transaction(function () use ($student): void {
            $user = $student->user;
            $student->delete();
            $user->delete();
        });

        return back()->with('success', $name.' dihapus.');
    }

    /** Cabut perangkat terikat; perangkat berikutnya yang dipakai masuk akan diikat (BR-07). */
    public function resetDevice(Student $student): RedirectResponse
    {
        $student->load('user');
        $count = DeviceBinding::revoke($student->user);

        return back()->with($count > 0 ? 'success' : 'error', $count > 0
            ? 'Perangkat '.$student->user->name.' direset. Perangkat berikutnya yang dipakai masuk akan diikat.'
            : $student->user->name.' belum punya perangkat terikat.');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function studentFields(array $data): array
    {
        return [
            'nim' => $data['nim'],
            'study_program_id' => $data['study_program_id'],
            'class_group_id' => $data['class_group_id'],
            'cohort_year' => $data['cohort_year'],
            'status' => $data['status'],
        ];
    }
}
