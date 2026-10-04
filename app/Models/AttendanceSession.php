<?php

namespace App\Models;

use App\Enums\SessionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Satu pertemuan (1–16) dan sesi presensi QR-nya. */
class AttendanceSession extends Model
{
    protected $fillable = ['class_schedule_id', 'meeting_no', 'session_date', 'opened_at', 'expires_at', 'closed_at', 'status', 'qr_token_hash', 'opened_by', 'room_latitude', 'room_longitude', 'room_radius_m'];

    protected function casts(): array
    {
        return [
            'status' => SessionStatus::class,
            'session_date' => 'date',
            'opened_at' => 'datetime',
            'expires_at' => 'datetime',
            'closed_at' => 'datetime',
            'room_latitude' => 'float',
            'room_longitude' => 'float',
            'room_radius_m' => 'integer',
        ];
    }

    public function classSchedule(): BelongsTo
    {
        return $this->belongsTo(ClassSchedule::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }
}
