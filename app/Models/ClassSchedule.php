<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Pemetaan Kelas: satu MK di satu kelas pada satu periode (sumber tunggal jadwal). */
class ClassSchedule extends Model
{
    protected $fillable = ['academic_period_id', 'class_group_id', 'course_id', 'lecturer_id', 'room_id', 'day_of_week', 'start_time', 'end_time', 'total_meetings'];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'total_meetings' => 'integer',
        ];
    }

    public function academicPeriod(): BelongsTo
    {
        return $this->belongsTo(AcademicPeriod::class);
    }

    public function classGroup(): BelongsTo
    {
        return $this->belongsTo(ClassGroup::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function lecturer(): BelongsTo
    {
        return $this->belongsTo(Lecturer::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(AttendanceSession::class);
    }
}
