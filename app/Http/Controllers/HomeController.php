<?php

namespace App\Http\Controllers;

use App\Enums\SessionStatus;
use App\Models\AcademicPeriod;
use App\Models\AttendanceSession;
use App\Services\AttendanceRecap;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Halaman awal: arahkan ke dasbor peran; beranda mahasiswa.
 */
class HomeController extends Controller
{
    public function index(Request $request): RedirectResponse
    {
        return redirect($request->user()?->role->homePath() ?? '/masuk');
    }

    public function student(Request $request): Response
    {
        $student = $request->user()->student()
            ->with(['studyProgram:id,name', 'classGroup:id,code,advisor_lecturer_id', 'classGroup.advisor:id,user_id', 'classGroup.advisor.user:id,name'])
            ->firstOrFail();

        $todaySessions = AttendanceSession::query()
            ->whereDate('session_date', today())
            ->whereHas('classSchedule', fn ($q) => $q->where('class_group_id', $student->class_group_id)
                ->where('academic_period_id', AcademicPeriod::active()?->id))
            ->get(['id', 'status', 'expires_at']);

        $period = AcademicPeriod::active();

        return Inertia::render('student/dashboard', [
            'profile' => [
                'nim' => $student->nim,
                'studyProgram' => $student->studyProgram->name,
                'classGroup' => $student->classGroup->code,
                'cohortYear' => $student->cohort_year,
                'advisor' => $student->classGroup->advisor?->user->name,
            ],
            'period' => $period?->label(),
            // Status kelayakan UAS per mata kuliah (BR-16).
            'recap' => $period ? AttendanceRecap::forStudent($student, $period->id) : [],
            'today' => [
                'total' => $todaySessions->count(),
                'open' => $todaySessions->filter(fn (AttendanceSession $s): bool => $s->status === SessionStatus::Open && ($s->expires_at?->isFuture() ?? false))->count(),
            ],
        ]);
    }
}
