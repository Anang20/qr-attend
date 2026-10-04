<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActiveStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\AcademicPeriod;
use App\Models\ClassGroup;
use App\Models\Course;
use App\Models\Lecturer;
use App\Models\Room;
use App\Models\Student;
use App\Models\User;
use App\Models\DeviceResetRequest;
use App\Enums\RequestStatus;
use App\Models\ClassSchedule;
use App\Services\DashboardStats;
use App\Support\DashboardFilter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $period = AcademicPeriod::active();
        // Filter global grafik: bawaan = periode aktif, seluruh semester, semua mata kuliah & kelas.
        $filter = $period ? DashboardFilter::fromRequest($request, $period) : null;

        return Inertia::render('admin/dashboard', [
            'period' => $period ? [
                'label' => $period->label(),
                'start' => $period->start_date->toDateString(),
                'end' => $period->end_date->toDateString(),
                'week' => max(1, (int) floor($period->start_date->diffInDays(now()) / 7) + 1),
            ] : null,
            'stats' => [
                'students' => Student::query()->count(),
                'lecturers' => Lecturer::query()->count(),
                'courses' => Course::query()->where('status', ActiveStatus::Active)->count(),
                'classGroups' => ClassGroup::query()->where('status', ActiveStatus::Active)->count(),
            ],
            'tasks' => [
                'pendingLecturers' => User::query()->where('role', UserRole::Lecturer)->where('status', UserStatus::Pending)->count(),
                'roomsWithoutPoint' => Room::query()->where('status', ActiveStatus::Active)->whereNull('latitude')->count(),
            ],
            'attendance' => $filter ? [
                'rate' => DashboardStats::overallRate($filter),
                'today' => DashboardStats::todayRecords($filter),
                'trend' => DashboardStats::trend($filter),
                'byCourse' => DashboardStats::byCourse($filter),
                'byClass' => DashboardStats::byClass($filter),
                'monthly' => DashboardStats::monthly($filter),
            ] : null,
            'chartFilters' => $filter?->toArray(),
            'chartOptions' => $filter ? $this->chartOptions($filter) : null,
            // Permintaan reset perangkat dari mahasiswa (BR-07).
            'resetRequests' => DeviceResetRequest::query()
                ->with(['user:id,name', 'user.student:id,user_id,nim', 'device:id,device_name'])
                ->where('status', RequestStatus::Pending)
                ->oldest()
                ->limit(10)
                ->get()
                ->map(fn (DeviceResetRequest $r): array => [
                    'id' => $r->id,
                    'name' => $r->user->name,
                    'nim' => $r->user->student?->nim,
                    'device' => $r->device?->device_name,
                    'reason' => $r->reason->label(),
                    'createdAt' => $r->created_at?->toIso8601String(),
                ]),
        ]);
    }

    /**
     * Pilihan filter grafik. Mata kuliah & kelas hanya yang dipetakan di periode terpilih.
     *
     * @return array<string, list<array{value: string, label: string}>>
     */
    private function chartOptions(DashboardFilter $filter): array
    {
        $schedules = ClassSchedule::query()
            ->with(['course:id,name', 'classGroup:id,code'])
            ->where('academic_period_id', $filter->period->id)
            ->get(['id', 'course_id', 'class_group_id']);

        return [
            'periods' => AcademicPeriod::query()->orderByDesc('start_date')->get()
                ->map(fn (AcademicPeriod $p): array => ['value' => (string) $p->id, 'label' => $p->label()])->values()->all(),
            'ranges' => [
                ['value' => '7', 'label' => '7 hari terakhir'],
                ['value' => '30', 'label' => '30 hari terakhir'],
                ['value' => '90', 'label' => '90 hari terakhir'],
                ['value' => 'all', 'label' => 'Seluruh semester'],
            ],
            'courses' => $schedules->pluck('course')->unique('id')->sortBy('name')
                ->map(fn (Course $c): array => ['value' => (string) $c->id, 'label' => $c->name])->values()->all(),
            'classGroups' => $schedules->pluck('classGroup')->unique('id')->sortBy('code')
                ->map(fn (ClassGroup $g): array => ['value' => (string) $g->id, 'label' => $g->code])->values()->all(),
        ];
    }
}
