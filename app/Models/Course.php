<?php

namespace App\Models;

use App\Enums\ActiveStatus;
use App\Enums\CourseType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Mata kuliah. */
class Course extends Model
{
    protected $fillable = ['code', 'name', 'credits', 'semester', 'type', 'study_program_id', 'status'];

    protected function casts(): array
    {
        return [
            'type' => CourseType::class,
            'status' => ActiveStatus::class,
            'credits' => 'integer',
            'semester' => 'integer',
        ];
    }

    public function studyProgram(): BelongsTo
    {
        return $this->belongsTo(StudyProgram::class);
    }

    public function classSchedules(): HasMany
    {
        return $this->hasMany(ClassSchedule::class);
    }
}
