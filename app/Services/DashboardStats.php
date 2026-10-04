<?php

namespace App\Services;

use App\Support\DashboardFilter;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Agregasi kehadiran untuk dasbor admin. Semua angka dihitung dari tabel attendances
 * (sumber tunggal), dibatasi oleh DashboardFilter (periode, rentang tanggal, mata kuliah, kelas)
 * sehingga semua grafik dan angka di dasbor selalu konsisten.
 *
 * Tingkat kehadiran = (Hadir + Terlambat + Izin) / seluruh catatan.
 */
final class DashboardStats
{
    private const ATTENDED = "SUM(CASE WHEN a.status IN ('present','late','excused') THEN 1 ELSE 0 END)";

    /** Rentang tanggal tidak dipakai untuk angka "hari ini" ($withRange = false). */
    private static function base(DashboardFilter $f, bool $withRange = true): Builder
    {
        return DB::table('attendances as a')
            ->join('attendance_sessions as s', 's.id', '=', 'a.attendance_session_id')
            ->join('class_schedules as cs', 'cs.id', '=', 's.class_schedule_id')
            ->where('cs.academic_period_id', $f->period->id)
            ->when($f->courseId, fn (Builder $q, int $id) => $q->where('cs.course_id', $id))
            ->when($f->classGroupId, fn (Builder $q, int $id) => $q->where('cs.class_group_id', $id))
            ->when($withRange && $f->from, fn (Builder $q) => $q->whereBetween('s.session_date', [$f->from->toDateString(), $f->to->toDateString()]));
    }

    /** Tingkat kehadiran harian dalam rentang filter. @return list<array{date: string, rate: float}> */
    public static function trend(DashboardFilter $f): array
    {
        return self::base($f)
            ->selectRaw('s.session_date as d, '.self::ATTENDED.' as attended, COUNT(*) as total')
            ->groupBy('s.session_date')
            ->orderBy('s.session_date')
            ->get()
            ->map(fn ($r): array => ['date' => (string) $r->d, 'rate' => round($r->attended / max(1, $r->total) * 100, 1)])
            ->values()
            ->all();
    }

    /** @return list<array{label: string, rate: float}> */
    public static function byCourse(DashboardFilter $f): array
    {
        return self::base($f)
            ->join('courses as c', 'c.id', '=', 'cs.course_id')
            ->selectRaw('c.name as label, '.self::ATTENDED.' as attended, COUNT(*) as total')
            ->groupBy('c.name')
            ->get()
            ->map(fn ($r): array => ['label' => (string) $r->label, 'rate' => round($r->attended / max(1, $r->total) * 100, 1)])
            ->sortByDesc('rate')
            ->values()
            ->all();
    }

    /** @return list<array{label: string, rate: float}> */
    public static function byClass(DashboardFilter $f): array
    {
        return self::base($f)
            ->join('class_groups as g', 'g.id', '=', 'cs.class_group_id')
            ->selectRaw('g.code as label, '.self::ATTENDED.' as attended, COUNT(*) as total')
            ->groupBy('g.code')
            ->orderBy('g.code')
            ->get()
            ->map(fn ($r): array => ['label' => (string) $r->label, 'rate' => round($r->attended / max(1, $r->total) * 100, 1)])
            ->values()
            ->all();
    }

    /** Porsi status per bulan (100%). @return list<array{month: string, present: float, late: float, absent: float, excused: float}> */
    public static function monthly(DashboardFilter $f): array
    {
        $rows = self::base($f)
            ->selectRaw("DATE_FORMAT(s.session_date, '%Y-%m') as m, a.status, COUNT(*) as total")
            ->groupBy('m', 'a.status')
            ->orderBy('m')
            ->get()
            ->groupBy('m');

        return $rows->map(function ($items, string $month): array {
            $sum = max(1, (int) $items->sum('total'));
            $pct = fn (string $status): float => round((int) ($items->firstWhere('status', $status)->total ?? 0) / $sum * 100, 1);

            return ['month' => $month, 'present' => $pct('present'), 'late' => $pct('late'), 'absent' => $pct('absent'), 'excused' => $pct('excused')];
        })->values()->all();
    }

    public static function overallRate(DashboardFilter $f): ?float
    {
        $r = self::base($f)->selectRaw(self::ATTENDED.' as attended, COUNT(*) as total')->first();

        return $r && $r->total > 0 ? round($r->attended / $r->total * 100, 1) : null;
    }

    public static function todayRecords(DashboardFilter $f): int
    {
        return self::base($f, withRange: false)->whereDate('s.session_date', today())->whereIn('a.status', ['present', 'late', 'excused'])->count();
    }
}
