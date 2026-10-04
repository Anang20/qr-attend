<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PeriodStatus;
use App\Enums\Semester;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AcademicPeriodRequest;
use App\Models\AcademicPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use App\Support\PerPage;

class AcademicPeriodController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['q', 'status']);

        $periods = AcademicPeriod::query()
            ->withCount([
                'classSchedules',
                'sessions as opened_sessions_count' => fn ($q) => $q->whereNotNull('opened_at'),
            ])
            ->when($filters['q'] ?? null, fn ($q, string $s) => $q->where('academic_year', 'like', "%{$s}%"))
            ->when($filters['status'] ?? null, fn ($q, string $s) => $q->where('status', $s))
            ->orderByDesc('start_date')
            ->paginate(PerPage::from($request))
            ->withQueryString()
            ->through(fn (AcademicPeriod $p): array => [
                'id' => $p->id,
                'label' => $p->label(),
                'academic_year' => $p->academic_year,
                'semester' => $p->semester->value,
                'start_date' => $p->start_date->toDateString(),
                'end_date' => $p->end_date->toDateString(),
                'status' => $p->status->value,
                'statusLabel' => $p->status->label(),
                'classSchedulesCount' => $p->class_schedules_count,
                'openedSessionsCount' => $p->opened_sessions_count,
            ]);

        return Inertia::render('admin/academic-periods/index', [
            'periods' => $periods,
            'filters' => $filters,
            'semesters' => Semester::options(),
            'statuses' => PeriodStatus::options(),
        ]);
    }

    public function store(AcademicPeriodRequest $request): RedirectResponse
    {
        $message = $this->save(new AcademicPeriod, $request->validated());

        return back()->with('success', $message);
    }

    public function update(AcademicPeriodRequest $request, AcademicPeriod $period): RedirectResponse
    {
        $message = $this->save($period, $request->validated());

        return back()->with('success', $message);
    }

    public function destroy(AcademicPeriod $period): RedirectResponse
    {
        if ($period->status === PeriodStatus::Active) {
            return back()->with('error', 'Periode Aktif tidak bisa dihapus.');
        }

        // BR-24: data yang sudah dipakai tidak bisa dihapus.
        if ($period->classSchedules()->exists()) {
            return back()->with('error', 'Periode '.$period->label().' tidak bisa dihapus karena sudah punya pemetaan kelas.');
        }

        $period->delete();

        return back()->with('success', 'Periode '.$period->label().' dihapus.');
    }

    /**
     * Simpan periode. BR-17: mengaktifkan periode otomatis menyelesaikan periode aktif lain.
     *
     * @param  array<string, mixed>  $data
     */
    private function save(AcademicPeriod $period, array $data): string
    {
        return DB::transaction(function () use ($period, $data): string {
            $demoted = null;

            if ($data['status'] === PeriodStatus::Active->value) {
                $previous = AcademicPeriod::query()
                    ->where('status', PeriodStatus::Active)
                    ->when($period->exists, fn ($q) => $q->whereKeyNot($period->id))
                    ->lockForUpdate()
                    ->first();

                if ($previous !== null) {
                    $previous->update(['status' => PeriodStatus::Finished]);
                    $demoted = $previous->label();
                }
            }

            $period->fill($data)->save();

            $message = 'Periode '.$period->label().' disimpan.';

            return $demoted ? $message.' Periode '.$demoted.' otomatis menjadi Selesai.' : $message;
        });
    }
}
