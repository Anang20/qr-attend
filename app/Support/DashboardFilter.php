<?php

namespace App\Support;

use App\Models\AcademicPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

/**
 * Filter global dasbor admin (satu baris di atas grafik; berlaku untuk semua grafik & angka).
 * Dibaca dari query string: period_id, range (7|30|90|all), course_id, class_group_id.
 */
final readonly class DashboardFilter
{
    public const RANGES = ['7', '30', '90', 'all'];

    public function __construct(
        public AcademicPeriod $period,
        public string $range,
        public ?CarbonImmutable $from,
        public CarbonImmutable $to,
        public ?int $courseId,
        public ?int $classGroupId,
    ) {}

    public static function fromRequest(Request $request, AcademicPeriod $fallback): self
    {
        $data = $request->validate([
            'period_id' => ['nullable', 'integer', 'exists:academic_periods,id'],
            'range' => ['nullable', 'in:'.implode(',', self::RANGES)],
            'course_id' => ['nullable', 'integer'],
            'class_group_id' => ['nullable', 'integer'],
        ]);

        $period = isset($data['period_id']) ? AcademicPeriod::query()->findOrFail($data['period_id']) : $fallback;
        $range = $data['range'] ?? 'all';

        // Rentang dihitung mundur dari hari ini, atau dari akhir periode bila periodenya sudah lewat.
        $end = CarbonImmutable::today()->min(CarbonImmutable::parse($period->end_date));
        $from = $range === 'all' ? null : $end->subDays((int) $range - 1);

        return new self(
            period: $period,
            range: $range,
            from: $from,
            to: $end,
            courseId: isset($data['course_id']) ? (int) $data['course_id'] : null,
            classGroupId: isset($data['class_group_id']) ? (int) $data['class_group_id'] : null,
        );
    }

    /** @return array{period_id: string, range: string, course_id: string|null, class_group_id: string|null} */
    public function toArray(): array
    {
        return [
            'period_id' => (string) $this->period->id,
            'range' => $this->range,
            'course_id' => $this->courseId !== null ? (string) $this->courseId : null,
            'class_group_id' => $this->classGroupId !== null ? (string) $this->classGroupId : null,
        ];
    }
}
