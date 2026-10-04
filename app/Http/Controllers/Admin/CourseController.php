<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActiveStatus;
use App\Enums\CourseType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CourseRequest;
use App\Models\Course;
use App\Support\Options;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['q', 'study_program_id', 'semester', 'status']);

        $courses = Course::query()
            ->with('studyProgram:id,name')
            ->withCount('classSchedules')
            ->when($filters['q'] ?? null, fn ($q, string $s) => $q->where(fn ($w) => $w
                ->where('code', 'like', "%{$s}%")
                ->orWhere('name', 'like', "%{$s}%")))
            ->when($filters['study_program_id'] ?? null, fn ($q, string $v) => $q->where('study_program_id', $v))
            ->when($filters['semester'] ?? null, fn ($q, string $v) => $q->where('semester', $v))
            ->when($filters['status'] ?? null, fn ($q, string $v) => $q->where('status', $v))
            ->orderBy('code')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Course $c): array => [
                'id' => $c->id,
                'code' => $c->code,
                'name' => $c->name,
                'credits' => (string) $c->credits,
                'semester' => (string) $c->semester,
                'type' => $c->type->value,
                'typeLabel' => $c->type->label(),
                'study_program_id' => (string) $c->study_program_id,
                'studyProgram' => $c->studyProgram->name,
                'status' => $c->status->value,
                'statusLabel' => $c->status->label(),
                'schedulesCount' => $c->class_schedules_count,
            ]);

        return Inertia::render('admin/courses/index', [
            'courses' => $courses,
            'filters' => $filters,
            'options' => [
                'studyPrograms' => Options::studyPrograms(),
                'types' => CourseType::options(),
                'statuses' => ActiveStatus::options(),
                'semesters' => array_map(fn (int $s): array => ['value' => (string) $s, 'label' => "Semester {$s}"], range(1, 8)),
            ],
        ]);
    }

    public function store(CourseRequest $request): RedirectResponse
    {
        $course = Course::query()->create($request->validated());

        return back()->with('success', $course->name.' ditambahkan.');
    }

    public function update(CourseRequest $request, Course $course): RedirectResponse
    {
        $course->update($request->validated());

        return back()->with('success', $course->name.' disimpan.');
    }

    public function destroy(Course $course): RedirectResponse
    {
        if ($course->classSchedules()->exists()) {
            return back()->with('error', $course->name.' tidak bisa dihapus karena sudah dipetakan ke kelas. Ubah status menjadi Nonaktif.');
        }

        $course->delete();

        return back()->with('success', $course->name.' dihapus.');
    }
}
