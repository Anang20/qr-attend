<?php

namespace App\Models;

use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Jejak perubahan status presensi. */
class AttendanceLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['attendance_id', 'old_status', 'new_status', 'method', 'changed_by', 'reason', 'created_at'];

    protected function casts(): array
    {
        return [
            'old_status' => AttendanceStatus::class,
            'new_status' => AttendanceStatus::class,
            'method' => AttendanceMethod::class,
            'created_at' => 'datetime',
        ];
    }

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }

    public function changer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
