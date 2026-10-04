<?php

namespace App\Models;

use App\Enums\ActiveStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Kelas (rombongan belajar), mis. SI-5A. */
class ClassGroup extends Model
{
    protected $fillable = ['code', 'study_program_id', 'cohort_year', 'advisor_lecturer_id', 'capacity', 'status'];

    protected function casts(): array
    {
        return [
            'status' => ActiveStatus::class,
            'cohort_year' => 'integer',
            'capacity' => 'integer',
        ];
    }

    public function studyProgram(): BelongsTo
    {
        return $this->belongsTo(StudyProgram::class);
    }

    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Lecturer::class, 'advisor_lecturer_id');
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    public function classSchedules(): HasMany
    {
        return $this->hasMany(ClassSchedule::class);
    }
}
