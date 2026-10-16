<?php

namespace App\Http\Controllers\Admin;

use App\Enums\StudentStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\MoveStudentsClassRequest;
use App\Http\Requests\Admin\StudentRequest;
use App\Models\AcademicPeriod;
use App\Models\ClassGroup;
use App\Models\Student;
use App\Models\User;
use App\Services\DeviceBinding;
use App\Support\Options;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use App\Support\PerPage;

class StudentController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['q', 'cohort_year', 'class_group_id', 'status', 'account']);

        $students = Student::query()
            ->with(['user:id,name,email,phone,status', 'classGroup:id,code', 'studyProgram:id,name'])
            ->withExists(['user as has_device' => fn ($q) => $q->whereHas('devices', fn ($d) => $d->where('status', 'active'))])
            ->when($filters['q'] ?? null, fn ($q, string $s) => $q->where(fn ($w) => $w
                ->where('nim', 'like', "%{$s}%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$s}%"))))
            ->when($filters['cohort_year'] ?? null, fn ($q, string $v) => $q->where('cohort_year', $v))
            ->when($filters['class_group_id'] ?? null, fn ($q, string $v) => $q->where('class_group_id', $v))
            ->when($filters['status'] ?? null, fn ($q, string $v) => $q->where('status', $v))
            ->when($filters['account'] ?? null, fn ($q, string $v) => $q->whereHas('user', fn ($u) => $u->where('status', $v)))
            // Akun menunggu persetujuan tampil paling atas.
            ->orderByRaw("(select case when users.status = 'pending' then 0 else 1 end from users where users.id = students.user_id)")
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
            'classInfo' => $this->classInfo(),
            'pendingCount' => User::query()->where('role', UserRole::Student)->where('status', UserStatus::Pending)->count(),
            'options' => [
                'studyPrograms' => Options::studyPrograms(),
                'classGroups' => Options::classGroups(),
                'cohortYears' => Options::cohortYears(),
                'statuses' => StudentStatus::options(),
                'accountStatuses' => UserStatus::options(),
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

    /**
     * Info kelas untuk peringatan di dialog pindah kelas: kapasitas, terisi, dan jumlah pertemuan
     * yang sudah terlaksana di periode aktif.
     *
     * @return array<string, array{capacity: int, students: int, held: int}>
     */
    private function classInfo(): array
    {
        $held = DB::table('attendance_sessions as s')
            ->join('class_schedules as cs', 'cs.id', '=', 's.class_schedule_id')
            ->where('cs.academic_period_id', AcademicPeriod::active()?->id)
            ->whereIn('s.status', ['expired', 'closed'])
            ->groupBy('cs.class_group_id')
            ->selectRaw('cs.class_group_id as id, count(*) as total')
            ->pluck('total', 'id');

        return ClassGroup::query()->withCount('students')->get(['id', 'capacity'])
            ->mapWithKeys(fn (ClassGroup $c): array => [(string) $c->id => [
                'capacity' => (int) $c->capacity,
                'students' => (int) $c->students_count,
                'held' => (int) ($held[$c->id] ?? 0),
            ]])
            ->all();
    }

    /** Pindahkan banyak mahasiswa ke satu kelas sekaligus. Riwayat presensi lama tetap tersimpan. */
    public function moveClass(MoveStudentsClassRequest $request): RedirectResponse
    {
        $class = ClassGroup::query()->findOrFail($request->integer('class_group_id'));

        $moved = DB::transaction(function () use ($request, $class): int {
            $students = Student::query()->lockForUpdate()
                ->whereIn('id', $request->input('student_ids'))
                ->where('class_group_id', '!=', $class->id)
                ->get(['id', 'class_group_id']);

            // Jejak pindah kelas ditulis ke log aplikasi (tanpa tabel/kolom baru): pelaku dan kelas asal → tujuan.
            Log::info('Pindah kelas mahasiswa', [
                'moved_by' => $request->user()->id,
                'to_class' => $class->code,
                'students' => $students->map(fn (Student $s): array => ['id' => $s->id, 'from_class_group_id' => $s->class_group_id])->all(),
            ]);

            return Student::query()->whereIn('id', $students->pluck('id'))->update(['class_group_id' => $class->id]);
        });

        return back()->with($moved > 0 ? 'success' : 'warning', $moved > 0
            ? "{$moved} mahasiswa dipindahkan ke kelas {$class->code}."
            : 'Semua mahasiswa terpilih sudah berada di kelas '.$class->code.'.');
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

    /** Setujui pendaftaran mahasiswa (BR-25). */
    public function approve(Student $student): RedirectResponse
    {
        $user = $student->user;

        if ($user->status !== UserStatus::Pending) {
            return back()->with('error', 'Akun ini tidak sedang menunggu persetujuan.');
        }

        $user->forceFill([
            'status' => UserStatus::Active,
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ])->save();

        return back()->with('success', 'Akun '.$user->name.' disetujui dan sudah bisa masuk.');
    }

    public function reject(Student $student): RedirectResponse
    {
        $user = $student->user;

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
