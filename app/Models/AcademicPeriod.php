<?php

namespace App\Models;

use App\Enums\PeriodStatus;
use App\Enums\Semester;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

/** Periode akademik (satu semester). */
class AcademicPeriod extends Model
{
    protected $fillable = ['academic_year', 'semester', 'start_date', 'end_date', 'status'];

    protected function casts(): array
    {
        return [
            'semester' => Semester::class,
            'status' => PeriodStatus::class,
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function classSchedules(): HasMany
    {
        return $this->hasMany(ClassSchedule::class);
    }

    public function sessions(): HasManyThrough
    {
        return $this->hasManyThrough(AttendanceSession::class, ClassSchedule::class);
    }

    /** "Ganjil 2026/2027" */
    public function label(): string
    {
        return $this->semester->label().' '.$this->academic_year;
    }

    public static function active(): ?self
    {
        return self::query()->where('status', PeriodStatus::Active)->first();
    }
}
