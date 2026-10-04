<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActiveStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ClassGroupRequest;
use App\Models\ClassGroup;
use App\Support\Options;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClassGroupController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['q', 'cohort_year', 'status']);

        $classes = ClassGroup::query()
            ->with(['studyProgram:id,name', 'advisor:id,user_id', 'advisor.user:id,name'])
            ->withCount('students')
            ->when($filters['q'] ?? null, fn ($q, string $s) => $q->where('code', 'like', "%{$s}%"))
            ->when($filters['cohort_year'] ?? null, fn ($q, string $v) => $q->where('cohort_year', $v))
            ->when($filters['status'] ?? null, fn ($q, string $v) => $q->where('status', $v))
            ->orderBy('code')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (ClassGroup $c): array => [
                'id' => $c->id,
                'code' => $c->code,
                'study_program_id' => (string) $c->study_program_id,
                'studyProgram' => $c->studyProgram->name,
                'cohort_year' => (string) $c->cohort_year,
                'advisor_lecturer_id' => $c->advisor_lecturer_id ? (string) $c->advisor_lecturer_id : '',
                'advisor' => $c->advisor?->user->name,
                'capacity' => (string) $c->capacity,
                'studentsCount' => $c->students_count,
                'status' => $c->status->value,
                'statusLabel' => $c->status->label(),
            ]);

        return Inertia::render('admin/class-groups/index', [
            'classGroups' => $classes,
            'filters' => $filters,
            'options' => [
                'studyPrograms' => Options::studyPrograms(),
                'lecturers' => Options::lecturers(),
                'cohortYears' => Options::cohortYears(),
                'statuses' => ActiveStatus::options(),
            ],
        ]);
    }

    public function store(ClassGroupRequest $request): RedirectResponse
    {
        $class = ClassGroup::query()->create($request->validated());

        return back()->with('success', 'Kelas '.$class->code.' ditambahkan.');
    }

    public function update(ClassGroupRequest $request, ClassGroup $classGroup): RedirectResponse
    {
        $classGroup->update($request->validated());

        return back()->with('success', 'Kelas '.$classGroup->code.' disimpan.');
    }

    public function destroy(ClassGroup $classGroup): RedirectResponse
    {
        if ($classGroup->students()->exists() || $classGroup->classSchedules()->exists()) {
            return back()->with('error', 'Kelas '.$classGroup->code.' tidak bisa dihapus karena masih punya mahasiswa atau pemetaan. Ubah status menjadi Nonaktif.');
        }

        $classGroup->delete();

        return back()->with('success', 'Kelas '.$classGroup->code.' dihapus.');
    }
}
